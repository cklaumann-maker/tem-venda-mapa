import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route para criar usuário (requer service role key)
 * Usado na ativação de conta
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, userId, inviteData, inviteId, token } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Se tem inviteId mas não tem inviteData, buscar do banco
    let finalInviteData = inviteData;
    if (inviteId && !finalInviteData) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        
        const { data: invite, error: inviteError } = await supabaseAdmin
          .from('user_invites')
          .select('*')
          .eq('id', inviteId)
          .maybeSingle();
        
        if (!inviteError && invite) {
          finalInviteData = invite;
        }
      }
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

    // Se não tem userId, verificar se o usuário já existe
    if (!finalUserId) {
      // Buscar usuário por email
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const existingUser = usersList?.users?.find((user: any) => 
        user.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        // Usuário já existe, atualizar senha
        console.log('ℹ️ Usuário já existe, atualizando senha:', existingUser.id);
        finalUserId = existingUser.id;
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          finalUserId,
          { 
            password,
            email_confirm: true, // Garantir que o email está confirmado
          }
        );

        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 400 }
          );
        }
      } else {
        // Usuário não existe, criar novo
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
      }
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

    // Criar ou atualizar perfil (sem email, pois está em auth.users)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: finalUserId,
        role: finalInviteData?.role || 'seller',
        org_id: finalInviteData?.company_id || finalInviteData?.network_id || null,
        network_id: finalInviteData?.network_id || finalInviteData?.company_id || null,
        default_store_id: finalInviteData?.store_id || null,
        first_login_completed: true,
        password_changed_at: new Date().toISOString(),
        invited_by: finalInviteData?.invited_by || null,
        invited_at: finalInviteData?.created_at || new Date().toISOString(),
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // Criar entrada em store_members se necessário
    const userRole = finalInviteData?.role || 'seller';
    const userNetworkId = finalInviteData?.network_id || finalInviteData?.company_id;
    const userStoreId = finalInviteData?.store_id;

    if (userRole === 'owner' || userRole === 'manager') {
      // Para owners e managers, criar acesso a todas as lojas da rede se não houver store_id específico
      if (!userStoreId && userNetworkId) {
        // Buscar todas as lojas da rede
        const { data: networkStores, error: storesError } = await supabaseAdmin
          .from('stores')
          .select('id')
          .eq('network_id', userNetworkId)
          .eq('is_active', true);

        if (!storesError && networkStores && networkStores.length > 0) {
          // Criar entradas em store_members para todas as lojas
          const storeMembers = networkStores.map(store => ({
            user_id: finalUserId,
            store_id: store.id,
            role: userRole === 'owner' ? 'admin' : 'manager',
            active: true,
          }));

          const { error: membersError } = await supabaseAdmin
            .from('store_members')
            .upsert(storeMembers, {
              onConflict: 'user_id,store_id',
            });

          if (membersError) {
            console.error('Erro ao criar store_members:', membersError);
            // Não falhar se isso der erro, mas logar
          } else {
            console.log(`✅ Criadas ${storeMembers.length} entradas em store_members para ${userRole}`);
          }
        }
      } else if (userStoreId) {
        // Se há store_id específico, criar entrada apenas para essa loja
        const { error: memberError } = await supabaseAdmin
          .from('store_members')
          .upsert({
            user_id: finalUserId,
            store_id: userStoreId,
            role: userRole === 'owner' ? 'admin' : 'manager',
            active: true,
          }, {
            onConflict: 'user_id,store_id',
          });

        if (memberError) {
          console.error('Erro ao criar store_member:', memberError);
        }
      }
    } else if (userStoreId) {
      // Para outros roles, criar entrada apenas para a loja específica
      const { error: memberError } = await supabaseAdmin
        .from('store_members')
        .upsert({
          user_id: finalUserId,
          store_id: userStoreId,
          role: userRole,
          active: true,
        }, {
          onConflict: 'user_id,store_id',
        });

      if (memberError) {
        console.error('Erro ao criar store_member:', memberError);
      }
    }

    // Marcar convite como usado
    const inviteIdToMark = inviteId || finalInviteData?.id;
    if (inviteIdToMark) {
      const { error: inviteError } = await supabaseAdmin
        .from('user_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', inviteIdToMark);

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

