import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { validateRequest, getEmailsSchema } from '@/lib/validation';
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
    const validation = await validateRequest(getEmailsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { userIds } = validation.data;

    const adminResult = await requireAdmin(request);
    if ('errorResponse' in adminResult) return adminResult.errorResponse;
    const { supabaseAdmin } = adminResult;

    const emails: Record<string, string> = {};

    // Buscar usuários em batch usando listUsers
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      safeLogger.error('Erro ao listar usuários:', listError);
    } else if (usersList?.users) {
      // Criar mapa de emails por user_id
      const userMap = new Map(usersList.users.map((u: any) => [u.id, u.email]));
      
      // Preencher emails apenas para os userIds solicitados
      userIds.forEach((userId: string) => {
        const email = userMap.get(userId);
        if (email) {
          emails[userId] = email;
        }
      });
    }

    return NextResponse.json({ emails });
  } catch (error) {
    safeLogger.error('Erro ao buscar emails:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar emails' },
      { status: 500 }
    );
  }
}

