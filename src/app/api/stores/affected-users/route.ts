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
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "ID da loja é obrigatório" },
        { status: 400 }
      );
    }

    // Chamar função do banco de dados
    const { data, error } = await supabaseAdmin.rpc(
      "get_users_affected_by_store_deactivation",
      {
        p_store_id: storeId,
      }
    );

    if (error) {
      safeLogger.error("Erro ao obter usuários afetados:", error);
      return NextResponse.json(
        { error: "Erro ao obter usuários afetados. Tente novamente." },
        { status: 500 }
      );
    }

    // Contar total de usuários afetados
    const count = await supabaseAdmin.rpc(
      "count_users_affected_by_store_deactivation",
      {
        p_store_id: storeId,
      }
    );

    return NextResponse.json({
      success: true,
      users: data || [],
      totalCount: count.data || 0,
    });
  } catch (error: any) {
    safeLogger.error("Erro inesperado ao obter usuários afetados:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

