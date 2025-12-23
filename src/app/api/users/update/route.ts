import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, updateUserSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await apiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    
    // Validação com Zod
    const validation = await validateRequest(updateUserSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { userId, full_name, role, network_id, store_id } = validation.data;

    const adminResult = await requireAdmin(request);
    if ('errorResponse' in adminResult) return adminResult.errorResponse;
    const { supabaseAdmin } = adminResult;

    const updateData: any = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (network_id !== undefined) {
      updateData.network_id = network_id || null;
      updateData.org_id = network_id || null; // Compatibilidade
    }
    if (store_id !== undefined) updateData.default_store_id = store_id || null;

    // Verificar se o usuário existe antes de atualizar
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      safeLogger.error('Erro ao atualizar usuário:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLogger.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

