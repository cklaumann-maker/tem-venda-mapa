import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/**
 * API Route para envio de email de convite via SMTP do Gmail
 * O email é enviado via nodemailer usando as credenciais SMTP configuradas
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Configurações SMTP do Gmail
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurado');
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada. Configure SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    if (!smtpUser || !smtpPassword) {
      console.error('❌ Credenciais SMTP não configuradas');
      return NextResponse.json(
        { error: 'Credenciais SMTP não configuradas. Configure SMTP_USER e SMTP_PASSWORD.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const activationUrl = `${appUrl}/ativar-conta?token=${token}`;

    console.log('📧 Iniciando envio de convite para:', to);
    console.log('🔗 URL de ativação:', activationUrl);
    console.log('🔑 Token:', token.substring(0, 10) + '...');

    // Configurar transporter SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Enviar email via SMTP
    let emailSent = false;
    try {
      console.log('📧 Enviando email via SMTP do Gmail...');
      const mailOptions = {
        from: smtpFrom,
        to: to,
        subject: subject,
        html: html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado via SMTP. Message ID:', info.messageId);
      emailSent = true;
    } catch (emailError) {
      console.error('❌ Erro ao enviar email via SMTP:', emailError);
      return NextResponse.json(
        { 
          error: 'Erro ao enviar email', 
          details: emailError instanceof Error ? emailError.message : 'Erro desconhecido',
          emailSent: false,
        },
        { status: 500 }
      );
    }

    // Verificar se o usuário já existe usando listUsers
    console.log('🔍 Verificando se usuário já existe...');
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Aumentar limite para garantir que encontramos o usuário
    });
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      // Continuar mesmo com erro, pois pode ser problema de paginação
    }

    // Buscar usuário por email (case-insensitive)
    const existingUser = usersList?.users?.find((user: any) => 
      user.email?.toLowerCase() === to.toLowerCase()
    );
    
    if (existingUser) {
      console.log('✅ Usuário encontrado na verificação inicial:', existingUser.id);
    } else {
      console.log('ℹ️ Usuário não encontrado, será criado');
    }

    if (existingUser) {
      console.log('ℹ️ Usuário já existe:', existingUser.id);
      console.log('📧 Email confirmado:', existingUser.email_confirmed_at ? 'Sim' : 'Não');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email de convite enviado. Verifique sua caixa de entrada e spam.',
        userId: existingUser.id,
        email: to,
        activationUrl: activationUrl,
        emailSent: emailSent,
      });
    }

    console.log('🆕 Criando novo usuário...');
    
    // Extrair cargo do HTML (o template TypeScript inclui o cargo)
    const roleMatch = html.match(/Seu cargo será: <strong>([^<]+)<\/strong>/i) || 
                       html.match(/Seu Cargo[\s\S]*?font-weight: 600;">([^<]+)<\/p>/i) ||
                       html.match(/<strong[^>]*>([^<]+)<\/strong>/i);
    const roleLabel = roleMatch ? roleMatch[1].trim() : 'Colaborador';
    
    console.log('📋 Cargo extraído:', roleLabel);
    
    // Criar novo usuário e enviar email de confirmação
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: to,
      email_confirm: false,
      user_metadata: {
        invite_token: token,
        role: roleLabel,
      },
    });

    if (createError) {
      console.error('❌ Erro ao criar usuário:', createError);
      
      // Se o erro for porque o usuário já existe, verificar novamente e tratar
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists')) {
        console.log('ℹ️ Usuário já existe (detectado no erro), buscando novamente...');
        
        // Buscar o usuário existente
        const { data: usersList2, error: listError2 } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser2 = usersList2?.users?.find((user: any) => user.email === to);
        
        if (existingUser2) {
          console.log('✅ Usuário encontrado:', existingUser2.id);
          // Retornar sucesso, pois o convite já foi criado no banco antes desta chamada
          return NextResponse.json(
            { 
              success: true, 
              message: 'Usuário já existe. O convite foi registrado no sistema.',
              warning: 'Usuário já registrado',
              userId: existingUser2.id,
              email: to,
            },
            { status: 200 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Erro ao criar usuário', details: createError.message },
        { status: 500 }
      );
    }

    console.log('✅ Usuário criado:', newUser.user?.id);
    console.log('📋 ID do usuário:', newUser.user?.id);
    console.log('📋 Email confirmado:', newUser.user?.email_confirmed_at ? 'Sim' : 'Não');
    console.log('📧 Email enviado:', emailSent ? 'Sim (via SMTP)' : 'Não');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email de convite enviado. Verifique sua caixa de entrada e spam.',
      userId: newUser.user?.id,
      email: to,
      activationUrl: activationUrl,
      emailSent: emailSent,
    });
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

