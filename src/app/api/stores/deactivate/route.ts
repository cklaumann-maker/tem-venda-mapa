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

    const { storeId, migrationStrategy = "auto_migrate", notes } = await req.json();

    if (!storeId) {
      return NextResponse.json(
        { error: "ID da loja é obrigatório" },
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
    const { data, error } = await supabaseAdmin.rpc("deactivate_store", {
      p_store_id: storeId,
      p_performed_by: userId,
      p_migration_strategy: migrationStrategy,
      p_notes: notes || null,
    });

    if (error) {
      safeLogger.error("Erro ao desativar loja:", error);
      return NextResponse.json(
        { error: "Erro ao desativar loja. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    safeLogger.error("Erro inesperado ao desativar loja:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

