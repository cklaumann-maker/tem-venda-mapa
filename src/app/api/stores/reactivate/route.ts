import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";
import { z } from "zod";

const reactivateStoreSchema = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verificar autenticação e autorização
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { supabaseAdmin, currentUser } = adminResult;

    // Parse e validação do body
    let storeData: z.infer<typeof reactivateStoreSchema>;
    try {
      const body = await req.json();
      storeData = reactivateStoreSchema.parse(body);
    } catch (parseError: any) {
      if (parseError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parseError.errors },
          { status: 400 }
        );
      }
      safeLogger.error("Erro ao parsear body:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar dados da requisição" },
        { status: 400 }
      );
    }

    const userId = currentUser?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não identificado" },
        { status: 401 }
      );
    }

    // Chamar função SQL de reativação
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("reactivate_store", {
      p_store_id: storeData.storeId,
      p_performed_by: userId,
      p_notes: storeData.notes || null,
    });

    if (rpcError) {
      safeLogger.error("Erro ao reativar loja via RPC:", rpcError);
      return NextResponse.json(
        { 
          error: "Erro ao reativar loja",
          details: process.env.NODE_ENV === 'development' ? rpcError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!rpcResult?.success) {
      return NextResponse.json(
        { error: rpcResult?.error || "Erro ao reativar loja" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: "Loja reativada com sucesso",
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao reativar loja:", error);
    
    try {
      return NextResponse.json(
        { 
          error: "Erro interno do servidor",
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    } catch (jsonError: any) {
      console.error("Erro ao criar NextResponse:", jsonError);
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

