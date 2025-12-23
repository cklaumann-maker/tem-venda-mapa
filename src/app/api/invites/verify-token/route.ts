import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, verifyTokenSchema } from '@/lib/validation';

/**
 * API Route para verificar token de convite
 * Usa service role key para bypass RLS, pois o usuário ainda não tem conta
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // Validação com Zod
    const validation = await validateRequest(verifyTokenSchema, { token: token || '' });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const validatedToken = validation.data.token;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      safeLogger.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurado');
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const cleanToken = validatedToken.trim();
    safeLogger.log('🔍 [verify-token] Buscando convite com token:', cleanToken.substring(0, 20) + '...');

    // Buscar convite por token exato
    let { data: invite, error } = await supabaseAdmin
      .from('user_invites')
      .select('*')
      .eq('token', cleanToken)
      .is('deleted_at', null)
      .maybeSingle();

    // Se não encontrar, tentar busca flexível (para lidar com conversões O->0)
    if (!invite && !error) {
      safeLogger.warn('⚠️ [verify-token] Token exato não encontrado. Tentando busca flexível...');
      
      const { data: allActiveInvites, error: allError } = await supabaseAdmin
        .from('user_invites')
        .select('*')
        .is('deleted_at', null)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!allError && allActiveInvites) {
        const normalizeToken = (t: string) => t.replace(/O/g, '0').replace(/o/g, '0');
        const normalizedCleanToken = normalizeToken(cleanToken);

        const matchingInvite = allActiveInvites.find((inv: any) => {
          if (!inv.token) return false;
          const normalizedInviteToken = normalizeToken(inv.token);
          return normalizedInviteToken === normalizedCleanToken;
        });

        if (matchingInvite) {
          safeLogger.log('✅ [verify-token] Token encontrado com busca flexível!');
          invite = matchingInvite;
        }
      }
    }

    if (error) {
      safeLogger.error('❌ [verify-token] Erro na query:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar convite' },
        { status: 500 }
      );
    }

    if (!invite) {
      safeLogger.warn('⚠️ [verify-token] Convite não encontrado');
      return NextResponse.json(
        { error: 'Convite não encontrado ou token inválido' },
        { status: 404 }
      );
    }

    // Verificar se já foi usado
    if (invite.used_at) {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado' },
        { status: 400 }
      );
    }

    // Verificar se expirou
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      );
    }

    safeLogger.log('✅ [verify-token] Convite encontrado:', invite.id);
    
    // Retornar apenas os dados necessários (sem token por segurança)
    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        network_id: invite.network_id,
        store_id: invite.store_id,
        expires_at: invite.expires_at,
      },
    });
  } catch (error) {
    safeLogger.error('❌ [verify-token] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar token' },
      { status: 500 }
    );
  }
}

