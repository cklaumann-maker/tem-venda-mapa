import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para criar usuário (requer service role key)
 * Usado na ativação de conta
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, userId, inviteData } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Usar service role key para operações admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
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

    let finalUserId = userId;

    // Se não tem userId, criar novo usuário
    if (!finalUserId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      if (!newUser.user) {
        return NextResponse.json(
          { error: 'Erro ao criar usuário' },
          { status: 500 }
        );
      }

      finalUserId = newUser.user.id;
    } else {
      // Atualizar senha de usuário existente
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        finalUserId,
        { password }
      );

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }
    }

    // Criar ou atualizar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: finalUserId,
        email,
        role: inviteData?.role || 'seller',
        org_id: inviteData?.company_id || null,
        default_store_id: inviteData?.store_id || null,
        first_login_completed: true,
        password_changed_at: new Date().toISOString(),
        invited_by: inviteData?.invited_by || null,
        invited_at: inviteData?.created_at || new Date().toISOString(),
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // Marcar convite como usado
    if (inviteData?.id) {
      const { error: inviteError } = await supabaseAdmin
        .from('user_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', inviteData.id);

      if (inviteError) {
        console.error('Erro ao marcar convite como usado:', inviteError);
        // Não falhar se isso der erro
      }
    }

    return NextResponse.json({
      success: true,
      userId: finalUserId,
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}

