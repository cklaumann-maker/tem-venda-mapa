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
    let body: any = {};
    let storeData: any = null;
    
    try {
      body = await req.json();
      
      // Extrair dados da loja se fornecidos (opcional) - precisa estar acessível fora do try
      storeData = body?.store || null;
      
      // Log do body (sem dados sensíveis) em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        const bodyForLog = {
          ...body,
          owner: body.owner ? {
            ...body.owner,
            password: '***',
            password_confirm: '***',
          } : body.owner,
          store: storeData ? { ...storeData } : null,
        };
        safeLogger.log("Body recebido para criação de rede:", JSON.stringify(bodyForLog, null, 2));
        safeLogger.log("Campos presentes no body:", {
          hasOwner: !!body.owner,
          hasStore: !!storeData,
          ownerFields: body.owner ? Object.keys(body.owner) : [],
          storeFields: storeData ? Object.keys(storeData) : [],
          networkFields: Object.keys(body).filter(k => k !== 'owner' && k !== 'store'),
        });
      }
      
      // Validar apenas os campos da rede (sem owner e store)
      const bodyForValidation = { ...body };
      delete bodyForValidation.owner;
      delete bodyForValidation.store;
      
      // Usar safeParse para ter mais controle sobre erros
      const validationResult = createNetworkSchema.safeParse(bodyForValidation);
      
      // Log do resultado da validação
      if (process.env.NODE_ENV === 'development') {
        safeLogger.log("Resultado da validação Zod:", {
          success: validationResult.success,
          hasError: !!validationResult.error,
          errorType: validationResult.error?.constructor?.name,
          errorIssues: validationResult.error?.issues,
        });
      }
      
      if (!validationResult.success) {
        // Log detalhado para debug
        safeLogger.error("Erro de validação Zod - validationResult:", {
          hasError: !!validationResult.error,
          errorType: validationResult.error?.constructor?.name,
          errorName: validationResult.error?.name,
          errorsLength: validationResult.error?.errors?.length || 0,
          errors: validationResult.error?.errors,
          issuesLength: validationResult.error?.issues?.length || 0,
          issues: validationResult.error?.issues,
        });
        
        // Tentar usar issues se errors estiver vazio (pode acontecer com refine)
        // ZodError tem tanto 'errors' quanto 'issues', mas 'issues' é o array principal
        const zodIssues = validationResult.error?.issues || validationResult.error?.errors || [];
        
        // Log dos erros brutos
        if (process.env.NODE_ENV === 'development') {
          console.log('Zod issues raw:', JSON.stringify(zodIssues, null, 2));
          console.log('Zod error completo:', JSON.stringify(validationResult.error, null, 2));
        }
        
        // Garantir que details seja sempre um array válido
        let errorDetails: Array<{ path: string; message: string }> = [];
        
        if (Array.isArray(zodIssues) && zodIssues.length > 0) {
          errorDetails = zodIssues.map((e: any) => {
            try {
              // Garantir que e seja um objeto válido
              if (!e || typeof e !== 'object') {
                safeLogger.error("Erro Zod não é objeto:", e);
                return {
                  path: 'campo',
                  message: 'Erro de validação',
                };
              }
              
              // Processar path
              let pathStr = 'campo';
              if (e.path) {
                if (Array.isArray(e.path)) {
                  pathStr = e.path.join('.');
                } else if (typeof e.path === 'string') {
                  pathStr = e.path;
                } else {
                  pathStr = String(e.path);
                }
              }
              
              // Processar message
              const messageStr = e.message ? String(e.message) : 'Erro de validação';
              
              return {
                path: pathStr,
                message: messageStr,
              };
            } catch (mapError: any) {
              safeLogger.error("Erro ao processar erro de validação:", mapError, e);
              return {
                path: 'campo',
                message: 'Erro ao processar validação',
              };
            }
          });
        } else {
          // Se zodIssues está vazio, logar informações de debug
          safeLogger.error("zodIssues está vazio ou não é array:", {
            zodIssues,
            isArray: Array.isArray(zodIssues),
            length: zodIssues?.length,
            validationResultError: validationResult.error,
            hasErrors: !!validationResult.error?.errors,
            hasIssues: !!validationResult.error?.issues,
            errorsLength: validationResult.error?.errors?.length || 0,
            issuesLength: validationResult.error?.issues?.length || 0,
          });
        }
        
        // Se não conseguiu processar nenhum erro, adicionar erro genérico com informações de debug
        if (errorDetails.length === 0) {
          safeLogger.error("Nenhum erro de validação foi processado. validationResult.error completo:", JSON.stringify(validationResult.error, null, 2));
          
          // Tentar extrair mensagem do refine se houver
          let refineMessage = 'Erro de validação - verifique os campos obrigatórios';
          if (validationResult.error?.issues && validationResult.error.issues.length > 0) {
            const firstIssue = validationResult.error.issues[0];
            if (firstIssue.message) {
              refineMessage = firstIssue.message;
            }
          }
          
          errorDetails = [{ 
            path: 'dados', 
            message: `${refineMessage}. (Debug: ${zodIssues.length === 0 ? 'sem issues Zod' : 'issues não processados'})` 
          }];
        }
        
        return NextResponse.json(
          { 
            error: "Dados inválidos", 
            message: "Alguns campos obrigatórios estão faltando ou têm valores inválidos",
            details: errorDetails
          },
          { status: 400 }
        );
      }
      
      networkData = validationResult.data;
    } catch (parseError: any) {
      safeLogger.error("Erro ao parsear body:", parseError);
      return NextResponse.json(
        { 
          error: "Erro ao processar dados da requisição", 
          message: process.env.NODE_ENV === 'development' ? parseError.message : "Erro ao processar dados da requisição",
          details: process.env.NODE_ENV === 'development' ? [{ path: 'body', message: parseError.message }] : undefined 
        },
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
        { 
          error: `Já existe um usuário com o e-mail "${ownerData.email}"`,
          message: "Este e-mail já está cadastrado no sistema",
          details: [{ path: 'owner.email', message: `E-mail "${ownerData.email}" já está em uso` }]
        },
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
        { 
          error: `Já existe um usuário com o CPF "${ownerData.cpf}"`,
          message: "Este CPF já está cadastrado no sistema",
          details: [{ path: 'owner.cpf', message: `CPF "${ownerData.cpf}" já está em uso` }]
        },
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
        { 
          error: `Já existe uma rede com o nome "${networkData.name}"`,
          message: "Este nome de rede já está cadastrado",
          details: [{ path: 'name', message: `Nome "${networkData.name}" já está em uso` }]
        },
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
          { 
            error: `Já existe uma rede com o CNPJ "${networkData.cnpj}"`,
            message: "Este CNPJ já está cadastrado",
            details: [{ path: 'cnpj', message: `CNPJ "${networkData.cnpj}" já está em uso` }]
          },
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
      // org_id não deve ser preenchido - ele referencia orgs.id, não networks.id
      // Se necessário para compatibilidade, deve ser null ou um org_id válido
      org_id: null,
      cpf: cleanCPF,
      is_active: true,
    };

    // Adicionar campos opcionais do proprietário
    if (ownerData.birth_date) profileInsertData.birth_date = ownerData.birth_date;
    if (ownerData.photo_url) profileInsertData.photo_url = ownerData.photo_url;

    // Inserir perfil
    // NOTA: Se houver erro com trigger log_user_changes() tentando usar old_values/new_values
    // em vez de old_value/new_value, será necessário corrigir a função no banco de dados
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

    // Criar primeira loja se dados foram fornecidos
    let createdStore = null;
    
    if (storeData && storeData.name && storeData.cnpj && storeData.company_name) {
      try {
        // Validar e preparar dados da loja
        const cleanStoreCNPJ = String(storeData.cnpj).replace(/\D/g, '');
        if (cleanStoreCNPJ.length !== 14) {
          safeLogger.warn("CNPJ da loja inválido, pulando criação da loja");
        } else {
          const storeInsertData: any = {
            network_id: networkId,
            name: String(storeData.name).trim(),
            cnpj: cleanStoreCNPJ,
            company_name: String(storeData.company_name).trim(),
            zip_code: String(storeData.zip_code || '').replace(/\D/g, '').substring(0, 8),
            state: String(storeData.state || '').trim().substring(0, 2).toUpperCase(),
            city: String(storeData.city || '').trim(),
            phone: String(storeData.phone || '').replace(/\D/g, ''),
            email: String(storeData.email || '').trim().toLowerCase(),
            is_active: true,
          };

          // Campos opcionais da loja
          if (storeData.street) storeInsertData.street = String(storeData.street).trim();
          if (storeData.street_number) storeInsertData.street_number = String(storeData.street_number).trim();
          if (storeData.address_complement) storeInsertData.address_complement = String(storeData.address_complement).trim();
          if (storeData.neighborhood) storeInsertData.neighborhood = String(storeData.neighborhood).trim();
          if (storeData.trade_name) storeInsertData.trade_name = String(storeData.trade_name).trim();
          if (storeData.state_registration) storeInsertData.state_registration = String(storeData.state_registration).trim();
          if (storeData.municipal_registration) storeInsertData.municipal_registration = String(storeData.municipal_registration).trim();
          if (storeData.logo_url) storeInsertData.logo_url = String(storeData.logo_url).trim();
          if (storeData.internal_code) storeInsertData.internal_code = String(storeData.internal_code).trim();
          if (storeData.manager_name) storeInsertData.manager_name = String(storeData.manager_name).trim();

          // Criar loja
          const { data: newStore, error: createStoreError } = await supabaseAdmin
            .from('stores')
            .insert(storeInsertData)
            .select()
            .single();

          if (createStoreError) {
            safeLogger.error("Erro ao criar primeira loja:", createStoreError);
            // Não falhar a criação da rede se a loja falhar, apenas logar
          } else {
            createdStore = newStore;
            safeLogger.log(`✅ Primeira loja "${newStore.name}" criada com sucesso`);

            // Criar entrada em store_members para o proprietário ter acesso à loja
            const { error: memberError } = await supabaseAdmin
              .from('store_members')
              .insert({
                store_id: newStore.id,
                user_id: ownerUserId,
                role: 'manager', // Proprietário é manager/admin
                active: true,
              });

            if (memberError) {
              safeLogger.error("Erro ao criar store_member para proprietário:", memberError);
              // Não falhar se isso der erro, mas logar
            } else {
              safeLogger.log("✅ Entrada em store_members criada para proprietário");
            }
          }
        }
      } catch (storeError: any) {
        safeLogger.error("Erro inesperado ao criar primeira loja:", storeError);
        // Não falhar a criação da rede se a loja falhar
      }
    }

    // TODO: Enviar email de boas-vindas ao proprietário com link para definir senha
    // Por enquanto, apenas retornar sucesso

    return NextResponse.json({
      success: true,
      data: {
        ...newNetwork,
        owner_id: ownerUserId,
      },
      message: createdStore 
        ? "Rede, proprietário e primeira loja criados com sucesso"
        : "Rede e proprietário criados com sucesso",
      owner: {
        id: ownerUserId,
        email: ownerData.email,
        // Não retornar senha temporária por segurança
      },
      store: createdStore ? {
        id: createdStore.id,
        name: createdStore.name,
      } : undefined,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Erro desconhecido';
    const errorStack = process.env.NODE_ENV === 'development' ? error?.stack : undefined;
    
    safeLogger.error("Erro inesperado ao criar rede:", {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
      errorName: error?.name,
    });
    
    try {
      return NextResponse.json(
        { 
          error: "Erro interno do servidor",
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          details: process.env.NODE_ENV === 'development' ? {
            type: error?.constructor?.name,
            name: error?.name,
          } : undefined,
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

