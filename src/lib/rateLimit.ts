import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './securityMonitor';

// Rate limit simples em memória (para produção, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requisições
  identifier?: (req: NextRequest) => string; // Função para identificar o usuário
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, identifier } = options;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = identifier 
      ? identifier(req) 
      : req.headers.get('x-forwarded-for') || 
        req.headers.get('x-real-ip') || 
        'unknown';

    const now = Date.now();
    const record = rateLimitMap.get(key);

    // Limpar registros expirados periodicamente
    if (Math.random() < 0.01) { // 1% das requisições
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.resetTime < now) {
          rateLimitMap.delete(k);
        }
      }
    }

    if (!record || record.resetTime < now) {
      // Nova janela
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return null; // Permitir
    }

    if (record.count >= maxRequests) {
      // Excedeu limite - registrar evento de segurança
      const endpoint = req.nextUrl.pathname;
      logSecurityEvent({
        type: 'rate_limit_hit',
        ip: key,
        endpoint,
        details: { maxRequests, count: record.count },
      });

      // Excedeu limite
      return NextResponse.json(
        { 
          error: 'Muitas requisições. Tente novamente em alguns instantes.',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
          },
        }
      );
    }

    // Incrementar contador
    record.count++;
    return null; // Permitir
  };
}

// Presets comuns
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 tentativas
  identifier: (req) => {
    // Identificar por IP
    return req.headers.get('x-forwarded-for') || 
           req.headers.get('x-real-ip') || 
           'unknown';
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 60, // 60 requisições por minuto
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10, // 10 requisições por minuto
});

