import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { apiRateLimit } from "@/lib/rateLimit";
import { safeLogger } from "@/lib/safeLogger";

/**
 * POST /api/networks/draft
 * Salva ou atualiza um rascunho de criação de rede
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verificar autenticação
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { currentUser, supabaseAdmin } = adminResult;
    const user = currentUser;

    // Parse do body
    let body: { owner_data?: any; network_data?: any; store_data?: any; current_step?: number };
    try {
      body = await req.json();
    } catch (parseError: any) {
      safeLogger.error("Erro ao parsear body:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar dados da requisição" },
        { status: 400 }
      );
    }

    const { owner_data = {}, network_data = {}, store_data = {}, current_step = 0 } = body;

    // Verificar se já existe um rascunho para este usuário
    const { data: existingDraft, error: fetchError } = await supabaseAdmin
      .from('network_creation_drafts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      safeLogger.error("Erro ao buscar rascunho existente:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar rascunho existente" },
        { status: 500 }
      );
    }

    // Upsert do rascunho
    const draftData = {
      user_id: user.id,
      network_data: network_data || {},
      store_data: store_data || {},
      current_step: current_step || 0,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
    };

    // SEGURANÇA: Incluir owner_data no network_data, mas SEM senhas
    // Senhas NUNCA devem ser armazenadas em drafts (localStorage ou banco de dados)
    if (owner_data && Object.keys(owner_data).length > 0) {
      const { password, password_confirm, ...ownerDataWithoutPassword } = owner_data;
      draftData.network_data = { ...draftData.network_data, _owner_data: ownerDataWithoutPassword };
    }

    const { data: draft, error: upsertError } = existingDraft
      ? await supabaseAdmin
          .from('network_creation_drafts')
          .update(draftData)
          .eq('id', existingDraft.id)
          .select()
          .single()
      : await supabaseAdmin
          .from('network_creation_drafts')
          .insert(draftData)
          .select()
          .single();

    if (upsertError) {
      safeLogger.error("Erro ao salvar rascunho:", upsertError);
      return NextResponse.json(
        { error: "Erro ao salvar rascunho", details: process.env.NODE_ENV === 'development' ? upsertError.message : undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: draft,
      message: "Rascunho salvo com sucesso",
    });
  } catch (error: any) {
    safeLogger.error("Erro inesperado ao salvar rascunho:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/networks/draft
 * Recupera o rascunho de criação de rede do usuário autenticado
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verificar autenticação
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { currentUser, supabaseAdmin } = adminResult;
    const user = currentUser;

    // Buscar rascunho do usuário
    const { data: draft, error: fetchError } = await supabaseAdmin
      .from('network_creation_drafts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      safeLogger.error("Erro ao buscar rascunho:", fetchError);
      return NextResponse.json(
        { error: "Erro ao buscar rascunho" },
        { status: 500 }
      );
    }

    // Verificar se o rascunho expirou
    if (draft && new Date(draft.expires_at) < new Date()) {
      // Deletar rascunho expirado
      await supabaseAdmin
        .from('network_creation_drafts')
        .delete()
        .eq('id', draft.id);

      return NextResponse.json({
        success: true,
        data: null,
        message: "Rascunho expirado",
      });
    }

    return NextResponse.json({
      success: true,
      data: draft || null,
    });
  } catch (error: any) {
    safeLogger.error("Erro inesperado ao buscar rascunho:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/draft
 * Deleta o rascunho de criação de rede do usuário autenticado
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(req);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Verificar autenticação
    const adminResult = await requireAdmin(req);
    if ('errorResponse' in adminResult) {
      return adminResult.errorResponse;
    }

    const { currentUser, supabaseAdmin } = adminResult;
    const user = currentUser;

    // Deletar rascunho do usuário
    const { error: deleteError } = await supabaseAdmin
      .from('network_creation_drafts')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      safeLogger.error("Erro ao deletar rascunho:", deleteError);
      return NextResponse.json(
        { error: "Erro ao deletar rascunho", details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rascunho deletado com sucesso",
    });
  } catch (error: any) {
    safeLogger.error("Erro inesperado ao deletar rascunho:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

