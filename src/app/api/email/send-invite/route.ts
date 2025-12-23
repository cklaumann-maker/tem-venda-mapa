import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { authRateLimit } from '@/lib/rateLimit';
import { safeLogger } from '@/lib/safeLogger';
import { requireAdmin } from '@/lib/adminAuth';

/**
 * API Route para envio de email de convite via SMTP do Gmail
 * O email é enviado via nodemailer usando as credenciais SMTP configuradas
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { to, subject, html, token } = await request.json();

    if (!to || !subject || !html || !token) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html, token' },
        { status: 400 }
      );
    }

    const adminResult = await requireAdmin(request);
    if ('errorResponse' in adminResult) return adminResult.errorResponse;
    const { supabaseAdmin } = adminResult;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Configurações SMTP do Gmail
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPassword) {
      safeLogger.error('❌ Credenciais SMTP não configuradas');
      return NextResponse.json(
        { error: 'Credenciais SMTP não configuradas. Configure SMTP_USER e SMTP_PASSWORD.' },
        { status: 500 }
      );
    }

    const activationUrl = `${appUrl}/ativar-conta?token=${token}`;

    safeLogger.log('📧 Iniciando envio de convite para:', to);
    safeLogger.log('🔗 URL de ativação:', activationUrl);

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
      safeLogger.log('📧 Enviando email via SMTP do Gmail...');
      const mailOptions = {
        from: smtpFrom,
        to: to,
        subject: subject,
        html: html,
      };

      const info = await transporter.sendMail(mailOptions);
      safeLogger.log('✅ Email enviado via SMTP. Message ID:', info.messageId);
      emailSent = true;
    } catch (emailError) {
      safeLogger.error('❌ Erro ao enviar email via SMTP:', emailError);
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
    safeLogger.log('🔍 Verificando se usuário já existe...');
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Aumentar limite para garantir que encontramos o usuário
    });
    
    if (listError) {
      safeLogger.error('❌ Erro ao listar usuários:', listError);
      // Continuar mesmo com erro, pois pode ser problema de paginação
    }

    // Buscar usuário por email (case-insensitive)
    const existingUser = usersList?.users?.find((user: any) => 
      user.email?.toLowerCase() === to.toLowerCase()
    );
    
    if (existingUser) {
      safeLogger.log('✅ Usuário encontrado na verificação inicial:', existingUser.id);
    } else {
      safeLogger.log('ℹ️ Usuário não encontrado, será criado');
    }

    if (existingUser) {
      safeLogger.log('ℹ️ Usuário já existe:', existingUser.id);
      safeLogger.log('📧 Email confirmado:', existingUser.email_confirmed_at ? 'Sim' : 'Não');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Email de convite enviado. Verifique sua caixa de entrada e spam.',
        userId: existingUser.id,
        email: to,
        activationUrl: activationUrl,
        emailSent: emailSent,
      });
    }

    safeLogger.log('🆕 Criando novo usuário...');
    
    // Extrair cargo do HTML (o template TypeScript inclui o cargo)
    const roleMatch = html.match(/Seu cargo será: <strong>([^<]+)<\/strong>/i) || 
                       html.match(/Seu Cargo[\s\S]*?font-weight: 600;">([^<]+)<\/p>/i) ||
                       html.match(/<strong[^>]*>([^<]+)<\/strong>/i);
    const roleLabel = roleMatch ? roleMatch[1].trim() : 'Colaborador';
    
    safeLogger.log('📋 Cargo extraído:', roleLabel);
    
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
      safeLogger.error('❌ Erro ao criar usuário:', createError);
      
      // Se o erro for porque o usuário já existe, verificar novamente e tratar
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists')) {
        safeLogger.log('ℹ️ Usuário já existe (detectado no erro), buscando novamente...');
        
        // Buscar o usuário existente
        const { data: usersList2, error: listError2 } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser2 = usersList2?.users?.find((user: any) => user.email === to);
        
        if (existingUser2) {
          safeLogger.log('✅ Usuário encontrado:', existingUser2.id);
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
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    safeLogger.log('✅ Usuário criado:', newUser.user?.id);
    safeLogger.log('📋 ID do usuário:', newUser.user?.id);
    safeLogger.log('📋 Email confirmado:', newUser.user?.email_confirmed_at ? 'Sim' : 'Não');
    safeLogger.log('📧 Email enviado:', emailSent ? 'Sim (via SMTP)' : 'Não');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email de convite enviado. Verifique sua caixa de entrada e spam.',
      userId: newUser.user?.id,
      email: to,
      activationUrl: activationUrl,
      emailSent: emailSent,
    });
  } catch (error) {
    safeLogger.error('Erro ao enviar email de convite:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
}

