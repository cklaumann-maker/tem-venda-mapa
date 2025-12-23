import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, toggleActiveSchema } from '@/lib/validation';
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
    const validation = await validateRequest(toggleActiveSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { userId, isActive } = validation.data;

    const adminResult = await requireAdmin(request);
    if ('errorResponse' in adminResult) return adminResult.errorResponse;
    const { supabaseAdmin } = adminResult;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) {
      safeLogger.error('Erro ao alterar status do usuário:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLogger.error('Erro ao alterar status do usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao alterar status do usuário' },
      { status: 500 }
    );
  }
}

