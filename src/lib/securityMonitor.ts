/**
 * Monitoramento básico de segurança
 * Registra tentativas suspeitas de acesso
 */

import { safeLogger } from './safeLogger';

interface SecurityEvent {
  type: 'rate_limit_hit' | 'unauthorized_access' | 'invalid_token' | 'admin_operation';
  ip: string;
  userId?: string;
  endpoint: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Em produção, isso deveria ser salvo em um banco de dados ou serviço de logging
// Por enquanto, apenas loga (pode ser integrado com Sentry, LogRocket, etc.)
const securityEvents: SecurityEvent[] = [];

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  securityEvents.push(fullEvent);

  // Em produção, enviar para serviço de logging
  if (process.env.NODE_ENV === 'production') {
    // Exemplo: enviar para Sentry, LogRocket, ou banco de dados
    safeLogger.log('[SECURITY EVENT]', fullEvent);
  } else {
    safeLogger.warn('[SECURITY EVENT]', fullEvent);
  }

  // Limpar eventos antigos (manter apenas últimas 1000)
  if (securityEvents.length > 1000) {
    securityEvents.shift();
  }
}

export function getRecentSecurityEvents(limit = 50): SecurityEvent[] {
  return securityEvents.slice(-limit).reverse();
}

export function getSecurityEventCount(type: SecurityEvent['type'], minutes = 15): number {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return securityEvents.filter(
    event => event.type === type && new Date(event.timestamp) > cutoff
  ).length;
}

/**
 * Verifica se há atividade suspeita (múltiplas tentativas de acesso não autorizado)
 */
export function checkSuspiciousActivity(ip: string): boolean {
  const recentUnauthorized = getSecurityEventCount('unauthorized_access', 15);
  const recentRateLimit = getSecurityEventCount('rate_limit_hit', 15);
  
  // Se houver mais de 10 tentativas não autorizadas ou rate limit hits em 15 minutos
  return recentUnauthorized > 10 || recentRateLimit > 20;
}

