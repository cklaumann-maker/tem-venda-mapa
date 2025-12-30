import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";
import { createNetworkSchema } from "@/lib/validation";
import { z } from "zod";

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
          { 
            error: "Dados inválidos", 
            details: parseError.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            }))
          },
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
    const { data: existingNetworkByName, error: checkNameError } = await supabaseAdmin
      .from('networks')
      .select('id, name')
      .ilike('name', networkData.name)
      .maybeSingle();

    if (checkNameError && checkNameError.code !== 'PGRST116') {
      safeLogger.error("Erro ao verificar rede existente:", checkNameError);
      return NextResponse.json(
        { error: "Erro ao verificar rede existente" },
        { status: 500 }
      );
    }

    if (existingNetworkByName) {
      return NextResponse.json(
        { error: `Já existe uma rede com o nome "${networkData.name}"` },
        { status: 409 }
      );
    }

    // Verificar se CNPJ já existe (se fornecido)
    if (networkData.cnpj && networkData.cnpj.trim() !== '') {
      const { data: existingNetworkByCNPJ, error: checkCNPJError } = await supabaseAdmin
        .from('networks')
        .select('id, name, cnpj')
        .eq('cnpj', networkData.cnpj)
        .maybeSingle();

      if (checkCNPJError && checkCNPJError.code !== 'PGRST116') {
        safeLogger.error("Erro ao verificar CNPJ existente:", checkCNPJError);
        return NextResponse.json(
          { error: "Erro ao verificar CNPJ existente" },
          { status: 500 }
        );
      }

      if (existingNetworkByCNPJ) {
        return NextResponse.json(
          { error: `Já existe uma rede com o CNPJ "${networkData.cnpj}"` },
          { status: 409 }
        );
      }
    }

    // Preparar dados para inserção
    const insertData: any = {
      // Campos obrigatórios
      name: networkData.name,
      primary_email: networkData.primary_email,
      primary_phone: networkData.primary_phone,
      zip_code: networkData.zip_code,
      state: networkData.state,
      city: networkData.city,
      is_active: true,
    };

    // Campos opcionais - apenas se fornecidos
    if (networkData.logo_url) insertData.logo_url = networkData.logo_url;
    if (networkData.trade_name) insertData.trade_name = networkData.trade_name;
    if (networkData.cnpj && networkData.cnpj.trim() !== '') insertData.cnpj = networkData.cnpj;
    if (networkData.company_name) insertData.company_name = networkData.company_name;
    if (networkData.state_registration) insertData.state_registration = networkData.state_registration;
    if (networkData.municipal_registration) insertData.municipal_registration = networkData.municipal_registration;
    if (networkData.website) insertData.website = networkData.website;
    if (networkData.description) insertData.description = networkData.description;
    if (networkData.street) insertData.street = networkData.street;
    if (networkData.street_number) insertData.street_number = networkData.street_number;
    if (networkData.address_complement) insertData.address_complement = networkData.address_complement;
    if (networkData.neighborhood) insertData.neighborhood = networkData.neighborhood;
    if (networkData.secondary_phone) insertData.secondary_phone = networkData.secondary_phone;
    if (networkData.secondary_email) insertData.secondary_email = networkData.secondary_email;
    if (networkData.whatsapp) insertData.whatsapp = networkData.whatsapp;
    if (networkData.founded_at) insertData.founded_at = networkData.founded_at;
    if (networkData.estimated_store_count !== undefined) insertData.estimated_store_count = networkData.estimated_store_count;
    if (networkData.monthly_revenue_target !== undefined) insertData.monthly_revenue_target = networkData.monthly_revenue_target;
    if (networkData.avg_employees_per_store !== undefined) insertData.avg_employees_per_store = networkData.avg_employees_per_store;
    if (networkData.market_segment) insertData.market_segment = networkData.market_segment;
    if (networkData.business_model) insertData.business_model = networkData.business_model;
    if (networkData.currency) insertData.currency = networkData.currency;
    if (networkData.fiscal_month_end_day !== undefined) insertData.fiscal_month_end_day = networkData.fiscal_month_end_day;
    if (networkData.primary_bank_code) insertData.primary_bank_code = networkData.primary_bank_code;
    if (networkData.erp_integration !== undefined) insertData.erp_integration = networkData.erp_integration;
    if (networkData.erp_type) insertData.erp_type = networkData.erp_type;
    if (networkData.internal_notes) insertData.internal_notes = networkData.internal_notes;
    if (networkData.tags && networkData.tags.length > 0) insertData.tags = networkData.tags;

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

