import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { apiRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, zapiSendSchema } from '@/lib/validation';

interface ZApiConfig {
  instance_id: string;
  token: string;
  client_token_encrypted?: string;
}

// Função server-side para buscar configuração do banco
async function loadZApiConfigServer(): Promise<ZApiConfig | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const supabase = supabaseClient();
    
    const { data, error } = await supabase
      .from("zapi_config")
      .select("instance_id, token, client_token_encrypted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as ZApiConfig;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await apiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    
    // Validação com Zod
    const validation = await validateRequest(zapiSendSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { phone, message, instanceId, token, clientToken } = validation.data;
    
    // Tenta usar os parâmetros fornecidos, senão busca do banco
    let finalInstanceId = instanceId;
    let finalToken = token;
    let finalClientToken = clientToken;
    
    // Se faltar algum dado, tenta buscar do banco
    if (!finalInstanceId || !finalToken || !finalClientToken) {
      try {
        const config = await loadZApiConfigServer();
        if (config) {
          if (!finalInstanceId) {
            finalInstanceId = config.instance_id;
          }
          if (!finalToken) {
            finalToken = config.token;
          }
          // Se o clientToken não foi fornecido mas temos criptografado, 
          // retornamos erro informando que precisa descriptografar no cliente
          if (!finalClientToken && config.client_token_encrypted) {
            // Não podemos descriptografar no servidor (usa sessionStorage)
            // Então usamos variável de ambiente ou erro
            safeLogger.warn('Client-token criptografado encontrado, mas não podemos descriptografar no servidor. Use variável de ambiente ou forneça no parâmetro.');
          }
        }
      } catch (dbError) {
        safeLogger.warn('Não foi possível buscar configuração do banco:', dbError);
      }
    }
    
    // Fallback seguro para variáveis de ambiente (sem valores hardcoded)
    if (!finalInstanceId) {
      // Preferir variáveis somente de servidor, manter compatibilidade com possíveis configs antigas
      finalInstanceId = process.env.ZAPI_INSTANCE_ID || process.env.NEXT_PUBLIC_ZAPI_INSTANCE || "";
    }
    if (!finalToken) {
      finalToken = process.env.ZAPI_TOKEN || process.env.NEXT_PUBLIC_ZAPI_TOKEN || "";
    }
    if (!finalClientToken) {
      finalClientToken = process.env.ZAPI_CLIENT_TOKEN || "";
    }
    
    // Valida se temos todos os dados necessários
    if (!finalInstanceId || !finalToken || !finalClientToken) {
      safeLogger.error('❌ Configuração Z-API incompleta');
      return NextResponse.json(
        { error: 'Configuração Z-API incompleta. É necessário instanceId, token e clientToken (salvos ou nas variáveis de ambiente)' },
        { status: 500 }
      );
    }

    // Valida o formato do client-token (deve ter pelo menos 20 caracteres)
    if (finalClientToken.length < 20) {
      safeLogger.error('❌ Client-token inválido (muito curto)');
    }

    // Constrói a URL dinamicamente
    const url = `https://api.z-api.io/instances/${finalInstanceId}/token/${finalToken}/send-text`;
    
    safeLogger.log('🚀 Enviando mensagem via Z-API (API Route)...');
    safeLogger.log('URL:', url);
    safeLogger.log('Body:', {
      phone: phone,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-token': finalClientToken // Exatamente como no reqbin que funcionou
      },
      body: JSON.stringify({
        phone: phone,
        message: message
      })
    });

    safeLogger.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // Remove qualquer possível exposição do client-token na mensagem de erro
      const safeErrorText = errorText.replace(/client-token[:\s]+[^\s"]+/gi, 'client-token: ***REDACTED***');
      safeLogger.error(`❌ Erro na API Z-API: ${response.status} - ${safeErrorText}`);
      return NextResponse.json(
        { error: `Erro na API Z-API: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    safeLogger.log('✅ Resposta Z-API recebida');
    
    // Z-API pode retornar diferentes formatos de sucesso
    const isSuccess = result.success === true || 
                     result.status === 'success' || 
                     result.status === 'sent' ||
                     result.messageId ||
                     (result.data && result.data.messageId) ||
                     response.status === 200;
    
    safeLogger.log('✅ Mensagem enviada com sucesso:', isSuccess);
    
    return NextResponse.json({ 
      success: isSuccess, 
      result: result 
    });

  } catch (error) {
    safeLogger.error('❌ Erro ao enviar mensagem via Z-API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

