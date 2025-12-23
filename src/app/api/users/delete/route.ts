import { NextRequest, NextResponse } from 'next/server';
import { strictRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, deleteUserSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await strictRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    
    // Validação com Zod
    const validation = await validateRequest(deleteUserSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { userId } = validation.data;

    const adminResult = await requireAdmin(request);
    if ('errorResponse' in adminResult) return adminResult.errorResponse;
    const { supabaseAdmin, currentUser } = adminResult;
    if (!supabaseAdmin && errorResponse) return errorResponse;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.id,
        is_active: false,
      })
      .eq('id', userId);

    if (error) {
      safeLogger.error('Erro ao excluir usuário:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLogger.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
}

