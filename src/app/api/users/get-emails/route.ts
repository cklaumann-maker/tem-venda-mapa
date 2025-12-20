import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds deve ser um array' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const emails: Record<string, string> = {};

    // Buscar usuários em batch usando listUsers
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error('Erro ao listar usuários:', listError);
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
    console.error('Erro ao buscar emails:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar emails', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

