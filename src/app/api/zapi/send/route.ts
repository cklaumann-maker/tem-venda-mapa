import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

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
  try {
    const { phone, message, instanceId, token, clientToken } = await request.json();
    
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
            console.warn('Client-token criptografado encontrado, mas não podemos descriptografar no servidor. Use variável de ambiente ou forneça no parâmetro.');
          }
        }
      } catch (dbError) {
        console.warn('Não foi possível buscar configuração do banco:', dbError);
      }
    }
    
    // Fallback para variáveis de ambiente
    if (!finalInstanceId) {
      finalInstanceId = process.env.NEXT_PUBLIC_ZAPI_INSTANCE || '3E5617B992C1A1A44BE92AC1CE4E084C';
    }
    if (!finalToken) {
      finalToken = process.env.NEXT_PUBLIC_ZAPI_TOKEN || '965006A3DBD3AE6A5ACF05EF';
    }
    if (!finalClientToken) {
      finalClientToken = process.env.ZAPI_CLIENT_TOKEN;
    }
    
    // Valida se temos todos os dados necessários
    if (!finalInstanceId || !finalToken || !finalClientToken) {
      console.error('❌ Configuração Z-API incompleta:', {
        hasInstanceId: !!finalInstanceId,
        hasToken: !!finalToken,
        hasClientToken: !!finalClientToken,
        instanceIdFromParam: !!instanceId,
        tokenFromParam: !!token,
        clientTokenFromParam: !!clientToken
      });
      return NextResponse.json(
        { error: 'Configuração Z-API incompleta. É necessário instanceId, token e clientToken (salvos ou nas variáveis de ambiente)' },
        { status: 500 }
      );
    }

    // Valida o formato do client-token (deve ter pelo menos 20 caracteres)
    if (finalClientToken.length < 20) {
      console.error('❌ Client-token inválido (muito curto)');
    }

    // Constrói a URL dinamicamente
    const url = `https://api.z-api.io/instances/${finalInstanceId}/token/${finalToken}/send-text`;
    
    console.log('🚀 Enviando mensagem via Z-API (API Route)...');
    console.log('URL:', url);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'client-token': '***REDACTED***' // Nunca expor o client-token em logs
    });
    console.log('Body:', {
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

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      // Remove qualquer possível exposição do client-token na mensagem de erro
      const safeErrorText = errorText.replace(/client-token[:\s]+[^\s"]+/gi, 'client-token: ***REDACTED***');
      console.error(`❌ Erro na API Z-API: ${response.status} - ${safeErrorText}`);
      return NextResponse.json(
        { error: `Erro na API Z-API: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Resposta Z-API:', result);
    
    // Z-API pode retornar diferentes formatos de sucesso
    const isSuccess = result.success === true || 
                     result.status === 'success' || 
                     result.status === 'sent' ||
                     result.messageId ||
                     (result.data && result.data.messageId) ||
                     response.status === 200;
    
    console.log('✅ Mensagem enviada com sucesso:', isSuccess);
    
    return NextResponse.json({ 
      success: isSuccess, 
      result: result 
    });

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem via Z-API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

