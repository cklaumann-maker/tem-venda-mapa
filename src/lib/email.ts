/**
 * Serviço de envio de emails
 * Usa Supabase Auth para envio de emails de autenticação
 */

import { getPasswordResetEmailTemplate } from './email-templates/password-reset';

interface InviteEmailData {
  email: string;
  token: string;
  inviterName: string;
  companyName: string;
  storeName?: string;
  role: string;
}

interface PasswordResetEmailData {
  email: string;
  token: string;
}

/**
 * Envia email de convite para novo usuário
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const activationUrl = `${baseUrl}/ativar-conta?token=${data.token}`;

    const emailSubject = `Convite para ${data.companyName}`;
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para ${data.companyName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Você foi convidado!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Olá,
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${data.inviterName}</strong> convidou você para fazer parte de <strong>${data.companyName}</strong>${data.storeName ? ` - ${data.storeName}` : ''}.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Seu cargo será: <strong>${getRoleLabel(data.role)}</strong>
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" 
               style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Ativar Minha Conta
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Ou copie e cole este link no seu navegador:
          </p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
            ${activationUrl}
          </p>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            <strong>Importante:</strong> Este link expira em 7 dias. Após clicar, você precisará definir uma senha para sua conta.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>Se você não esperava este convite, pode ignorar este email.</p>
        </div>
      </body>
      </html>
    `;

    // Chama API route para envio de email
    const response = await fetch('/api/email/send-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.email,
        subject: emailSubject,
        html: emailBody,
        token: data.token,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao enviar email de convite:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    return false;
  }
}

/**
 * Envia email de recuperação de senha
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/recuperar-senha?token=${data.token}`;

    const emailSubject = 'Redefinir sua senha - TEM VENDA';
    const emailBody = getPasswordResetEmailTemplate(resetUrl, data.email);

    // Chama API route para envio de email
    const response = await fetch('/api/email/send-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.email,
        subject: emailSubject,
        html: emailBody,
        token: data.token,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao enviar email de recuperação:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return false;
  }
}

/**
 * Converte role para label legível
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    finance: 'Financeiro',
    leader: 'Líder',
    owner: 'Proprietário',
  };
  return labels[role] || role;
}

