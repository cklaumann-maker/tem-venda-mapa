import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit, passwordCreationRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";
import { createNetworkSchema, passwordSchema } from "@/lib/validation";
import { logSecurityEvent } from "@/lib/securityMonitor";
import { constantTimeCompare, sanitizePassword } from "@/lib/passwordUtils";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    // SEGURANÇA: Forçar HTTPS em produção
    if (process.env.NODE_ENV === 'production') {
      const protocol = req.headers.get('x-forwarded-proto') || 
                      req.headers.get('x-forwarded-ssl') || 
                      'http';
      if (!protocol.includes('https')) {
        return NextResponse.json(
          { error: 'HTTPS é obrigatório em produção' },
          { status: 403 }
        );
      }
    }

    // Rate limiting geral
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Rate limiting específico para criação de senha/proprietário (mais restritivo)
    const passwordRateLimitResult = await passwordCreationRateLimit(req);
    if (passwordRateLimitResult) {
      return passwordRateLimitResult;
    }

    // Verificar autenticação e autorização
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { supabaseAdmin, currentUser } = adminResult;

    // Parse e validação do body
    let networkData: z.infer<typeof createNetworkSchema>;
    try {
      const body = await req.json();
      safeLogger.log("Body recebido para criação de rede"); // Não logar body completo (pode conter dados sensíveis)
      networkData = createNetworkSchema.parse(body);
    } catch (parseError: any) {
      if (parseError instanceof z.ZodError) {
        safeLogger.error("Erro de validação Zod:", parseError.errors);
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
        { error: "Erro ao processar dados da requisição", details: process.env.NODE_ENV === 'development' ? parseError.message : undefined },
        { status: 400 }
      );
    }

    // Validar dados do proprietário (obrigatório)
    if (!networkData.owner) {
      return NextResponse.json(
        { error: "Dados do proprietário são obrigatórios" },
        { status: 400 }
      );
    }

    const ownerData = networkData.owner;

    // SEGURANÇA: Sanitizar senha antes de processar
    ownerData.password = sanitizePassword(ownerData.password);
    ownerData.password_confirm = sanitizePassword(ownerData.password_confirm);

    // Verificar se email do proprietário já está em uso
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    
    const existingUserByEmail = usersList?.users?.find((u: any) => 
      u.email?.toLowerCase() === ownerData.email.toLowerCase()
    );

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: `Já existe um usuário com o e-mail "${ownerData.email}"` },
        { status: 409 }
      );
    }

    // Verificar se CPF já está em uso (limpar formatação)
    const cleanCPF = ownerData.cpf.replace(/[^\d]/g, '');
    const { data: existingProfileByCPF } = await supabaseAdmin
      .from('profiles')
      .select('id, cpf')
      .eq('cpf', cleanCPF)
      .maybeSingle();

    if (existingProfileByCPF) {
      return NextResponse.json(
        { error: `Já existe um usuário com o CPF "${ownerData.cpf}"` },
        { status: 409 }
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

    // Validar senha do proprietário
    if (!ownerData.password) {
      return NextResponse.json(
        { error: "Senha do proprietário é obrigatória" },
        { status: 400 }
      );
    }

    // Validar confirmação de senha usando comparação constante (timing-safe)
    if (!constantTimeCompare(ownerData.password, ownerData.password_confirm)) {
      return NextResponse.json(
        { error: "As senhas não coincidem" },
        { status: 400 }
      );
    }

    // Validar formato da senha usando o schema
    const passwordValidation = passwordSchema.safeParse(ownerData.password);
    if (!passwordValidation.success) {
      return NextResponse.json(
        { 
          error: "Senha inválida", 
          details: passwordValidation.error.errors.map(e => e.message).join(", ")
        },
        { status: 400 }
      );
    }
    
    // Criar usuário no auth.users com a senha fornecida
    const { data: newOwnerUser, error: createOwnerError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerData.email,
      password: ownerData.password,
      email_confirm: true, // Email já confirmado pois o admin está criando o usuário
      user_metadata: {
        full_name: ownerData.full_name,
        role: 'owner',
      },
    });

    if (createOwnerError || !newOwnerUser.user) {
      safeLogger.error("Erro ao criar usuário do proprietário:", createOwnerError);
      return NextResponse.json(
        { error: "Erro ao criar usuário do proprietário", details: process.env.NODE_ENV === 'development' ? createOwnerError?.message : undefined },
        { status: 500 }
      );
    }

    const ownerUserId = newOwnerUser.user.id;

    // SEGURANÇA: Registrar evento de auditoria (sem expor senha)
    logSecurityEvent({
      type: 'admin_operation',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userId: currentUser?.id,
      endpoint: '/api/networks/create',
      details: {
        operation: 'owner_password_created',
        ownerUserId: ownerUserId,
        ownerEmail: ownerData.email,
        networkName: networkData.name,
        timestamp: new Date().toISOString(),
      },
    });

    // Preparar dados para inserção da rede (sem owner_id ainda, será atualizado depois)
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

    // Campos opcionais - apenas se fornecidos e não vazios
    if (networkData.logo_url) insertData.logo_url = networkData.logo_url;
    if (networkData.trade_name && networkData.trade_name.trim() !== '') insertData.trade_name = networkData.trade_name;
    if (networkData.cnpj && networkData.cnpj.trim() !== '') insertData.cnpj = networkData.cnpj;
    if (networkData.company_name && networkData.company_name.trim() !== '') insertData.company_name = networkData.company_name;
    if (networkData.state_registration && networkData.state_registration.trim() !== '') insertData.state_registration = networkData.state_registration;
    if (networkData.municipal_registration && networkData.municipal_registration.trim() !== '') insertData.municipal_registration = networkData.municipal_registration;
    if (networkData.website && networkData.website.trim() !== '') insertData.website = networkData.website;
    if (networkData.address_complement && networkData.address_complement.trim() !== '') insertData.address_complement = networkData.address_complement;
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

    // Criar rede (sem owner_id primeiro)
    const { data: newNetwork, error: createError } = await supabaseAdmin
      .from('networks')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      // Se falhar, tentar deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      
      safeLogger.error("Erro ao criar rede:", {
        message: createError.message,
        code: createError.code,
        hint: createError.hint,
        details: createError.details,
      });
      return NextResponse.json(
        { 
          error: "Erro ao criar rede", 
          details: process.env.NODE_ENV === 'development' ? createError.message : undefined,
        },
        { status: 500 }
      );
    }

    const networkId = newNetwork.id;

    // Criar perfil do proprietário
    // Reutilizar cleanCPF já calculado anteriormente
    const profileInsertData: any = {
      id: ownerUserId,
      full_name: ownerData.full_name,
      role: 'owner',
      network_id: networkId,
      org_id: networkId, // Compatibilidade
      cpf: cleanCPF,
      is_active: true,
    };

    // Adicionar campos opcionais do proprietário
    if (ownerData.birth_date) profileInsertData.birth_date = ownerData.birth_date;
    if (ownerData.photo_url) profileInsertData.photo_url = ownerData.photo_url;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileInsertData);

    if (profileError) {
      // Se falhar, tentar limpar (deletar rede e usuário)
      await supabaseAdmin.from('networks').delete().eq('id', networkId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      
      safeLogger.error("Erro ao criar perfil do proprietário:", profileError);
      return NextResponse.json(
        { error: "Erro ao criar perfil do proprietário", details: process.env.NODE_ENV === 'development' ? profileError.message : undefined },
        { status: 500 }
      );
    }

    // Atualizar rede com owner_id
    const { error: updateOwnerError } = await supabaseAdmin
      .from('networks')
      .update({ owner_id: ownerUserId })
      .eq('id', networkId);

    if (updateOwnerError) {
      // Se falhar, tentar limpar
      await supabaseAdmin.from('profiles').delete().eq('id', ownerUserId);
      await supabaseAdmin.from('networks').delete().eq('id', networkId);
      await supabaseAdmin.auth.admin.deleteUser(ownerUserId);
      
      safeLogger.error("Erro ao vincular proprietário à rede:", updateOwnerError);
      return NextResponse.json(
        { error: "Erro ao vincular proprietário à rede", details: process.env.NODE_ENV === 'development' ? updateOwnerError.message : undefined },
        { status: 500 }
      );
    }

    // TODO: Enviar email de boas-vindas ao proprietário com link para definir senha
    // Por enquanto, apenas retornar sucesso

    return NextResponse.json({
      success: true,
      data: {
        ...newNetwork,
        owner_id: ownerUserId,
      },
      message: "Rede e proprietário criados com sucesso",
      owner: {
        id: ownerUserId,
        email: ownerData.email,
        // Não retornar senha temporária por segurança
      },
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    
    safeLogger.error("Erro inesperado ao criar rede:", {
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
    
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

