import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeLogger } from '@/lib/safeLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verificar se é uma requisição do Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    safeLogger.error('CRON_SECRET não configurado');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      safeLogger.error('Variáveis de ambiente do Supabase não configuradas');
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Criar cliente Supabase com service role key (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Chamar a função para marcar tarefas perdidas do dia anterior
    const { data, error } = await supabase.rpc('mark_missed_tasks');

    if (error) {
      safeLogger.error('Erro ao marcar tarefas perdidas:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tarefas perdidas marcadas com sucesso',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    safeLogger.error('Erro no cron job:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

