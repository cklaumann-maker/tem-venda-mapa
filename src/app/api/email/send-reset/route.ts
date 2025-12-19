import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

/**
 * API Route para envio de email de recuperação de senha
 * Usa Supabase Auth para enviar email de reset
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, token } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Usa Supabase Auth para enviar email de recuperação
    // O Supabase gerencia o token automaticamente
    const supabase = supabaseClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(to, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recuperar-senha`,
    });

    if (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // TODO: Em produção, você pode customizar o email usando um serviço externo
    // Por enquanto, o Supabase envia o email padrão de recuperação

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}

