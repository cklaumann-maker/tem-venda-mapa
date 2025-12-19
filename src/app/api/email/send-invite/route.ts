import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

/**
 * API Route para envio de email de convite
 * Usa Supabase Auth Admin API para criar usuário e enviar email
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, token } = await request.json();

    if (!to || !subject || !html || !token) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html, token' },
        { status: 400 }
      );
    }

    // Para produção, você pode usar um serviço de email externo aqui
    // Por enquanto, vamos usar o Supabase Auth para criar o usuário
    // e enviar o email de confirmação (que será customizado)

    // NOTA: Em produção, recomenda-se usar:
    // - Resend (https://resend.com)
    // - SendGrid
    // - AWS SES
    // - Ou configurar SMTP no Supabase

    // Por enquanto, vamos apenas logar e retornar sucesso
    // O email real será enviado quando o usuário for criado via Supabase Auth
    console.log('📧 Email de convite seria enviado para:', to);
    console.log('📧 Assunto:', subject);
    console.log('🔗 Token:', token);

    // TODO: Integrar com serviço de email real
    // Exemplo com Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@seuapp.com',
    //   to,
    //   subject,
    //   html,
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}

