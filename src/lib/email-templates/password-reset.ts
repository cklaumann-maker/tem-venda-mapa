/**
 * Template profissional de email de recuperação de senha
 * Baseado em emails de grandes empresas de tecnologia (Google, Microsoft, Apple)
 * Otimizado para não cair em spam
 */

export function getPasswordResetEmailTemplate(resetUrl: string, userEmail?: string): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'TEM VENDA';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const supportEmail = process.env.SUPPORT_EMAIL || 'suporte@temvenda.com.br';
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Redefinir sua senha - ${appName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Client-specific styles */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Prevent blue links on iOS */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
    
    /* Desktop styles */
    @media only screen and (min-width: 600px) {
      .email-container {
        width: 600px !important;
      }
      .email-body {
        padding: 40px !important;
      }
    }
    
    /* Mobile styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .email-body {
        padding: 24px !important;
      }
      .button {
        width: 100% !important;
        padding: 14px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader text (hidden, shown in email preview) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Redefina sua senha do ${appName} usando o link seguro abaixo.
  </div>
  
  <!-- Main email container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <!-- Email wrapper -->
        <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 24px 24px; background-color: #ffffff; border-radius: 8px 8px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                      Redefinir senha
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="email-body" style="padding: 32px 24px; background-color: #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #333333;">
                      Olá${userEmail ? ` ${userEmail.split('@')[0]}` : ''},
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #333333;">
                      Recebemos uma solicitação para redefinir a senha da sua conta ${appName}. Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center" style="background-color: #16a34a; border-radius: 6px;">
                                <a href="${resetUrl}" class="button" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #16a34a;">
                                  Redefinir senha
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative link -->
                    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">
                      Ou copie e cole este link no seu navegador:
                    </p>
                    <p style="margin: 8px 0 24px; font-size: 12px; line-height: 1.5; color: #999999; word-break: break-all; background-color: #f9f9f9; padding: 12px; border-radius: 4px; border: 1px solid #e5e5e5;">
                      ${resetUrl}
                    </p>
                    
                    <!-- Security notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #92400e; line-height: 1.4;">
                            ⚠️ Importante
                          </p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #78350f;">
                            Este link expira em <strong>1 hora</strong>. Se você não solicitou esta recuperação de senha, ignore este email. Sua senha permanecerá inalterada.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Additional info -->
                    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #666666;">
                      Por segurança, nunca compartilhe este link com ninguém. Nossa equipe nunca solicitará sua senha por email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 16px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666666;">
                      <strong>${appName}</strong>
                    </p>
                    <p style="margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: #999999;">
                      Sistema de Gestão Comercial
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0 0; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.5; color: #999999;">
                      Precisa de ajuda? Entre em contato: <a href="mailto:${supportEmail}" style="color: #16a34a; text-decoration: none;">${supportEmail}</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #999999;">
                      © ${currentYear} ${appName}. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Unsubscribe / Security notice (for spam filters) -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 20px auto 0;">
          <tr>
            <td align="center" style="padding: 0 24px;">
              <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #999999; text-align: center;">
                Este é um email automático de segurança. Não responda a este email.
                <br>
                Você recebeu este email porque uma solicitação de recuperação de senha foi feita para ${userEmail || 'sua conta'}.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

