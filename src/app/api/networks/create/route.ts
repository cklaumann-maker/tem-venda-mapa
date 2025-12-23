import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";
import { z } from "zod";

const createNetworkSchema = z.object({
  name: z.string().min(2, "O nome da rede deve ter pelo menos 2 caracteres").max(255, "O nome da rede é muito longo"),
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

    const { supabaseAdmin } = adminResult;

    // Parse e validação do body
    let networkData: z.infer<typeof createNetworkSchema>;
    try {
      const body = await req.json();
      networkData = createNetworkSchema.parse(body);
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

    // Verificar se já existe uma rede com o mesmo nome
    const { data: existingNetwork, error: checkError } = await supabaseAdmin
      .from('networks')
      .select('id, name')
      .ilike('name', networkData.name)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      safeLogger.error("Erro ao verificar rede existente:", checkError);
      return NextResponse.json(
        { error: "Erro ao verificar rede existente" },
        { status: 500 }
      );
    }

    if (existingNetwork) {
      return NextResponse.json(
        { error: `Já existe uma rede com o nome "${networkData.name}"` },
        { status: 409 }
      );
    }

    // Criar a rede
    const insertData: any = {
      name: networkData.name.trim(),
      is_active: true,
    };

    // Adicionar logo_url se fornecido
    if (networkData.logo_url) {
      insertData.logo_url = networkData.logo_url;
    }

    const { data: newNetwork, error: createError } = await supabaseAdmin
      .from('networks')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      safeLogger.error("Erro ao criar rede:", createError);
      return NextResponse.json(
        { error: "Erro ao criar rede", details: process.env.NODE_ENV === 'development' ? createError.message : undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newNetwork,
      message: "Rede criada com sucesso",
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao criar rede:", error);
    console.error("=== ERRO INESPERADO ===");
    console.error("Mensagem:", errorMessage);
    console.error("Stack:", error?.stack);
    
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

