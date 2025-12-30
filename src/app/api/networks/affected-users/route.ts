import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      // Rate limit excedido, retornar resposta de erro
      return rateLimitResult;
    }

    // Verificar autenticação e autorização
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { supabaseAdmin } = adminResult;

    const { searchParams } = new URL(req.url);
    const networkId = searchParams.get("networkId");

    if (!networkId) {
      return NextResponse.json(
        { error: "ID da rede é obrigatório" },
        { status: 400 }
      );
    }

    // Contar usuários afetados (tentar função SQL primeiro, depois fallback)
    let countData: number = 0;
    
    try {
      const countResult = await supabaseAdmin.rpc(
        "count_users_affected_by_network_deactivation",
        {
          p_network_id: networkId,
        }
      );
      if (!countResult.error) {
        countData = countResult.data || 0;
      }
    } catch (rpcCountError: any) {
      safeLogger.error("Erro ao chamar função de contagem:", rpcCountError);
    }

    // Se não conseguiu contar via função, usar fallback
    if (countData === 0) {
      try {
        const { count, error: countError } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .or(`network_id.eq.${networkId},org_id.eq.${networkId}`)
          .eq('is_active', true)
          .is('deleted_at', null);
        
        if (!countError && count !== null) {
          countData = count;
        }
      } catch (fallbackCountError: any) {
        safeLogger.error("Erro no fallback de contagem:", fallbackCountError);
      }
    }

    // Obter lista de usuários (tentar função SQL primeiro, depois fallback)
    let data: any[] = [];
    
    try {
      const result = await supabaseAdmin.rpc(
        "get_users_affected_by_network_deactivation",
        {
          p_network_id: networkId,
        }
      );
      if (!result.error && result.data) {
        data = result.data;
      }
    } catch (rpcError: any) {
      safeLogger.error("Erro ao chamar RPC, usando fallback:", rpcError);
    }

    // Se não conseguiu dados via função, usar fallback
    if (data.length === 0) {
      try {
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, role, network_id, org_id, default_store_id')
          .or(`network_id.eq.${networkId},org_id.eq.${networkId}`)
          .eq('is_active', true)
          .is('deleted_at', null);
        
        if (!profilesError && profilesData) {
          data = profilesData.map((p: any) => ({
            user_id: p.id,
            email: '',
            full_name: p.full_name,
            role: p.role,
            current_network_id: p.network_id || p.org_id,
            current_store_id: p.default_store_id,
            has_other_networks: false,
            has_other_stores: false
          }));
          
          // Atualizar contagem se necessário
          if (countData === 0 && data.length > 0) {
            countData = data.length;
          }
        }
      } catch (fallbackError: any) {
        safeLogger.error("Erro no fallback de listagem:", fallbackError);
        // Continuar com data vazio
      }
    }

    // Buscar emails se necessário (opcional, não crítico)
    let usersWithEmails = data || [];
    if (usersWithEmails.length > 0) {
      try {
        const userIds = usersWithEmails.map((u: any) => u.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          if (usersList?.users) {
            const emailMap = new Map(
              usersList.users.map((u: any) => [u.id, u.email])
            );
            
            usersWithEmails = usersWithEmails.map((user: any) => ({
              ...user,
              email: emailMap.get(user.user_id) || user.email || ''
            }));
          }
        }
      } catch (emailError) {
        safeLogger.error("Erro ao buscar emails (não crítico):", emailError);
        // Continuar sem emails se houver erro
      }
    }

    // Sempre retornar sucesso, mesmo se não houver dados
    return NextResponse.json({
      success: true,
      users: usersWithEmails,
      totalCount: countData || 0,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao obter usuários afetados:", {
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      type: typeof error,
    });
    
    // Sempre tentar retornar pelo menos uma resposta válida
    try {
      // Tentar obter pelo menos a contagem
      const { searchParams } = new URL(req.url);
      const networkId = searchParams.get("networkId");
      
      if (networkId) {
        const adminResult = await requireAdmin(req);
        if (!('errorResponse' in adminResult)) {
          const { supabaseAdmin } = adminResult;
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .or(`network_id.eq.${networkId},org_id.eq.${networkId}`)
            .eq('is_active', true)
            .is('deleted_at', null);
          
          return NextResponse.json({
            success: true,
            users: [],
            totalCount: count || 0,
            warning: "Erro ao obter lista detalhada, mas contagem disponível"
          });
        }
      }
    } catch (finalError: any) {
      safeLogger.error("Erro no fallback final:", finalError);
    }
    
    // Último recurso: retornar erro estruturado
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

