import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";
import { z } from "zod";

const reactivateNetworkSchema = z.object({
  networkId: z.string().uuid("ID da rede inválido"),
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
    let networkData: z.infer<typeof reactivateNetworkSchema>;
    try {
      const body = await req.json();
      networkData = reactivateNetworkSchema.parse(body);
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
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("reactivate_network", {
      p_network_id: networkData.networkId,
      p_performed_by: userId,
      p_notes: networkData.notes || null,
    });

    if (rpcError) {
      safeLogger.error("Erro ao reativar rede via RPC:", rpcError);
      return NextResponse.json(
        { 
          error: "Erro ao reativar rede",
          details: process.env.NODE_ENV === 'development' ? rpcError.message : undefined
        },
        { status: 500 }
      );
    }

    if (!rpcResult?.success) {
      return NextResponse.json(
        { error: rpcResult?.error || "Erro ao reativar rede" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: "Rede reativada com sucesso",
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao reativar rede:", error);
    
    try {
      return NextResponse.json(
        { 
          error: "Erro interno do servidor",
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    } catch (jsonError: any) {
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

