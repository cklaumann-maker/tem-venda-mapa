/**
 * Template profissional de email para convite de novo usuário
 * Segue as melhores práticas do mercado (Google, Microsoft, etc.)
 */

interface InviteEmailTemplateData {
  inviterName: string;
  companyName: string;
  storeName?: string;
  role: string;
  activationUrl: string;
  userEmail: string;
}

export function getUserInviteEmailTemplate(data: InviteEmailTemplateData): string {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    finance: 'Financeiro',
    leader: 'Líder',
    owner: 'Proprietário',
  };

  const roleLabel = roleLabels[data.role] || data.role;
  const storeInfo = data.storeName ? ` - ${data.storeName}` : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Convite para ${data.companyName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; line-height: 1.2;">
                Você foi convidado!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong style="color: #111827;">${escapeHtml(data.inviterName)}</strong> convidou você para fazer parte de <strong style="color: #111827;">${escapeHtml(data.companyName)}${escapeHtml(storeInfo)}</strong>.
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Seu cargo será: <strong style="color: #111827;">${escapeHtml(roleLabel)}</strong>
              </p>

              <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                  Seu Cargo
                </p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">
                  ${escapeHtml(roleLabel)}
                </p>
              </div>

              <p style="margin: 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Para começar, você precisa ativar sua conta e definir uma senha segura.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${data.activationUrl}" 
                       style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; line-height: 1.5; text-align: center; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">
                      Ativar Minha Conta
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 24px 0 12px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 12px; line-height: 1.5; font-family: 'Courier New', monospace;">
                ${data.activationUrl}
              </p>

              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong style="display: block; margin-bottom: 4px;">🔒 Importante:</strong>
                  Este link expira em <strong>7 dias</strong>. Após ativar sua conta, você precisará definir uma senha segura. Se você não esperava este convite, pode ignorar este email com segurança.
                </p>
              </div>

              <!-- Next Steps -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">
                  Próximos passos:
                </p>
                <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  <li>Clique no botão "Ativar Minha Conta" acima</li>
                  <li>Defina uma senha segura para sua conta</li>
                  <li>Faça login e comece a usar a plataforma</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                Este email foi enviado para <strong style="color: #374151;">${escapeHtml(data.userEmail)}</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 11px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} ${escapeHtml(data.companyName)}. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

