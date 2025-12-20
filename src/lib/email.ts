/**
 * Serviço de envio de emails
 * Usa Supabase Auth para envio de emails de autenticação
 */

import { getPasswordResetEmailTemplate } from './email-templates/password-reset';
import { getUserInviteEmailTemplate } from './email-templates/user-invite';

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
    console.log('📧 [sendInviteEmail] Iniciando envio de email...');
    console.log('📧 [sendInviteEmail] Email destino:', data.email);
    console.log('📧 [sendInviteEmail] Token:', data.token.substring(0, 10) + '...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    // Codificar o token na URL para evitar problemas com caracteres especiais
    // IMPORTANTE: encodeURIComponent preserva letras e números, mas alguns clientes de email
    // podem fazer conversões automáticas (ex: O -> 0). Vamos usar o token diretamente sem encoding
    // pois o token já é alfanumérico e seguro para URLs
    const activationUrl = `${baseUrl}/ativar-conta?token=${data.token}`;

    console.log('📧 [sendInviteEmail] URL de ativação:', activationUrl);
    console.log('📧 [sendInviteEmail] Token original:', data.token);
    console.log('📧 [sendInviteEmail] Token length:', data.token.length);

    const emailSubject = `Você foi convidado para ${data.companyName}`;
    const emailBody = getUserInviteEmailTemplate({
      inviterName: data.inviterName,
      companyName: data.companyName,
      storeName: data.storeName,
      role: data.role,
      activationUrl,
      userEmail: data.email,
    });

    console.log('📧 [sendInviteEmail] Chamando API /api/email/send-invite...');

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

    console.log('📧 [sendInviteEmail] Resposta recebida. Status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [sendInviteEmail] Erro ao enviar email de convite:', error);
      console.error('❌ [sendInviteEmail] Status:', response.status);
      console.error('❌ [sendInviteEmail] Detalhes:', JSON.stringify(error, null, 2));
      throw new Error(error.error || `Erro ao enviar email: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ [sendInviteEmail] Resposta do servidor:', result);
    
    // Se houver aviso na resposta, logar para debug
    if (result.warning) {
      console.warn('⚠️ [sendInviteEmail] Aviso:', result.warning);
    }
    
    if (result.note) {
      console.info('ℹ️ [sendInviteEmail] Nota:', result.note);
    }
    
    return true;
  } catch (error) {
    console.error('❌ [sendInviteEmail] Erro ao enviar email de convite:', error);
    if (error instanceof Error) {
      console.error('❌ [sendInviteEmail] Mensagem de erro:', error.message);
      console.error('❌ [sendInviteEmail] Stack:', error.stack);
    }
    throw error;
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

