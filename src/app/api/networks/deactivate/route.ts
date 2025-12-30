import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";

export async function POST(req: NextRequest) {
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

    const { supabaseAdmin, currentUser } = adminResult;

    // Parse do body com tratamento de erro
    let networkId: string;
    let migrationStrategy: string = "auto_migrate";
    let notes: string | null = null;
    
    try {
      const body = await req.json();
      networkId = body.networkId;
      migrationStrategy = body.migrationStrategy || "auto_migrate";
      notes = body.notes || null;
    } catch (parseError: any) {
      safeLogger.error("Erro ao parsear body:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar dados da requisição" },
        { status: 400 }
      );
    }

    if (!networkId) {
      return NextResponse.json(
        { error: "ID da rede é obrigatório" },
        { status: 400 }
      );
    }

    // Obter ID do usuário que está realizando a ação
    const userId = currentUser?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não identificado" },
        { status: 401 }
      );
    }

    // Chamar função do banco de dados
    let rpcResult: any = null;
    let rpcError: any = null;
    
    try {
      const result = await supabaseAdmin.rpc("deactivate_network", {
        p_network_id: networkId,
        p_performed_by: userId,
        p_migration_strategy: migrationStrategy,
        p_notes: notes || null,
      });
      rpcResult = result.data;
      rpcError = result.error;
    } catch (rpcException: any) {
      rpcError = rpcException;
      safeLogger.error("Exceção ao chamar RPC deactivate_network:", rpcException);
    }

    if (rpcError) {
      safeLogger.error("Erro ao desativar rede via RPC:", rpcError);
      safeLogger.error("Erro ao executar RPC de desativação de rede:", {
        message: rpcError?.message,
        code: rpcError?.code,
      });
      
      // Fallback: desativar manualmente se a função SQL falhar
      try {
        console.log("=== INICIANDO FALLBACK MANUAL ===");
        console.log("Network ID:", networkId);
        console.log("User ID:", userId);
        
        // Verificar se a rede existe e está ativa
        const { data: networkData, error: networkCheckError } = await supabaseAdmin
          .from('networks')
          .select('id, name, is_active')
          .eq('id', networkId)
          .single();
        
        if (networkCheckError || !networkData) {
          throw new Error(`Rede não encontrada: ${networkCheckError?.message || 'Rede não existe'}`);
        }
        
        // Preparar dados de atualização (apenas campos que existem)
        const updateData: any = {
          is_active: false,
          updated_at: new Date().toISOString()
        };
        
        // Adicionar campos opcionais se existirem na tabela
        updateData.deactivated_at = new Date().toISOString();
        updateData.deactivated_by = userId;
        
        // Desativar a rede
        console.log("Atualizando rede...");
        const { error: networkError, data: networkUpdateData } = await supabaseAdmin
          .from('networks')
          .update(updateData)
          .eq('id', networkId)
          .select();
        
        if (networkError) {
          safeLogger.error("Erro ao desativar rede:", networkError);
          throw networkError;
        }
        console.log("Rede desativada com sucesso:", networkUpdateData);
        
        // Buscar IDs das lojas da rede primeiro
        console.log("Buscando lojas da rede...");
        const { data: storesData, error: storesSelectError } = await supabaseAdmin
          .from('stores')
          .select('id')
          .or(`network_id.eq.${networkId},org_id.eq.${networkId}`);
        
        if (storesSelectError) {
          safeLogger.error("Erro ao buscar lojas:", storesSelectError);
          throw storesSelectError;
        }
        
        const storeIds = (storesData || []).map(s => s.id);
        console.log(`Encontradas ${storeIds.length} lojas para desativar`);
        
        // Desativar todas as lojas da rede
        if (storeIds.length > 0) {
          console.log("Desativando lojas...");
          const { error: storesError } = await supabaseAdmin
            .from('stores')
            .update({ 
              is_active: false,
              deactivated_at: new Date().toISOString(),
              deactivated_by: userId
            })
            .in('id', storeIds);
          
          if (storesError) {
            safeLogger.error("Erro ao desativar lojas:", storesError);
            throw storesError;
          }
          console.log("Lojas desativadas com sucesso");
          
          // Desativar membros das lojas
          console.log("Desativando membros das lojas...");
          const { error: membersError } = await supabaseAdmin
            .from('store_members')
            .update({ active: false })
            .in('store_id', storeIds);
          
          if (membersError) {
            safeLogger.error("Erro ao desativar membros (não crítico):", membersError);
            safeLogger.error("Erro ao desativar membros (não crítico):", membersError);
          } else {
            console.log("Membros desativados com sucesso");
          }
        }
        
        // Contar usuários antes de desativar
        console.log("Contando usuários da rede...");
        let affectedCount = 0;
        try {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .or(`network_id.eq.${networkId},org_id.eq.${networkId}`)
            .eq('is_active', true)
            .is('deleted_at', null);
          affectedCount = count || 0;
          console.log(`Encontrados ${affectedCount} usuários para desativar`);
        } catch (countError) {
          safeLogger.error("Erro ao contar usuários (não crítico):", countError);
        }
        
        // Desativar usuários da rede (se necessário)
        console.log("Desativando usuários da rede...");
        const { error: profilesError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: false })
          .or(`network_id.eq.${networkId},org_id.eq.${networkId}`)
          .eq('is_active', true)
          .is('deleted_at', null);
        
        if (profilesError) {
          safeLogger.error("Erro ao desativar perfis (não crítico):", profilesError);
          safeLogger.error("Erro ao desativar perfis (não crítico):", profilesError);
        } else {
          console.log(`Usuários desativados com sucesso`);
        }
        
        console.log("=== FALLBACK CONCLUÍDO COM SUCESSO ===");
        
        return NextResponse.json({
          success: true,
          data: {
            network_id: networkId,
            network_name: networkData?.name || 'Desconhecida',
            affected_users: affectedCount,
            migration_strategy: migrationStrategy,
            message: "Rede desativada manualmente (fallback)"
          },
          warning: "Função SQL falhou, desativação realizada manualmente"
        });
      } catch (fallbackError: any) {
        safeLogger.error("Erro no fallback manual de desativação:", {
          message: fallbackError?.message,
          stack: process.env.NODE_ENV === 'development' ? fallbackError?.stack : undefined,
        });
        safeLogger.error("Erro no fallback de desativação:", fallbackError);
        
        return NextResponse.json(
          { 
            error: "Erro ao desativar rede. A função SQL falhou e o fallback também falhou.",
            message: fallbackError?.message || "Erro desconhecido no fallback",
            details: process.env.NODE_ENV === 'development' ? {
              rpcError: rpcError?.message || JSON.stringify(rpcError),
              fallbackError: fallbackError?.message || JSON.stringify(fallbackError),
              stack: fallbackError?.stack
            } : undefined
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao desativar rede:", error);
    safeLogger.error("Erro inesperado ao desativar rede:", {
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      type: typeof error,
    });
    
    // Sempre retornar uma resposta válida
    try {
      return NextResponse.json(
        { 
          error: "Erro interno do servidor",
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    } catch (jsonError: any) {
      // Se até o NextResponse.json falhar, usar Response direto
      safeLogger.error("Erro ao criar NextResponse:", jsonError);
      return new Response(
        JSON.stringify({ 
          error: "Erro interno do servidor",
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

