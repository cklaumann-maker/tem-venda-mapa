import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logSecurityEvent } from './securityMonitor';

export async function requireAdmin(request: NextRequest): Promise<
  | { supabaseAdmin: SupabaseClient; currentUser?: { id: string } }
  | { errorResponse: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { errorResponse: NextResponse.json({ error: 'Configuração do Supabase não encontrada' }, { status: 500 }) };
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || "";
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent({
      type: 'unauthorized_access',
      ip,
      endpoint: request.nextUrl.pathname,
      details: { reason: 'Token ausente' },
    });
    return { errorResponse: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent({
      type: 'invalid_token',
      ip,
      endpoint: request.nextUrl.pathname,
      details: { error: userError?.message },
    });
    return { errorResponse: NextResponse.json({ error: 'Sessão inválida' }, { status: 401 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent({
      type: 'unauthorized_access',
      ip,
      userId: user.id,
      endpoint: request.nextUrl.pathname,
      details: { role: profile?.role, attemptedRole: 'admin' },
    });
    return { errorResponse: NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 }) };
  }

  // Registrar operação admin bem-sucedida
  logSecurityEvent({
    type: 'admin_operation',
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userId: user.id,
    endpoint: request.nextUrl.pathname,
  });

  return { supabaseAdmin, currentUser: user };
}

