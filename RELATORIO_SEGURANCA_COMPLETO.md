# 🔒 Relatório de Segurança - Análise Completa
**Data:** $(date)  
**Sistema:** Tem Venda Mapa  
**Escopo:** Backend + Frontend

---

## 📊 RESUMO EXECUTIVO

### ✅ Pontos Fortes Identificados
1. ✅ Uso de Supabase com RLS (Row Level Security)
2. ✅ Service Role Key apenas no backend
3. ✅ Autenticação via Supabase Auth (JWT)
4. ✅ Proteção de rotas admin implementada recentemente
5. ✅ Tokens Z-API removidos do código
6. ✅ Criptografia de dados sensíveis (client-token)
7. ✅ Validação de senha forte no frontend

### ⚠️ Vulnerabilidades Críticas Encontradas

#### 🔴 CRÍTICO (Corrigir Imediatamente)

1. **Falta de Headers de Segurança HTTP**
   - **Risco:** XSS, clickjacking, MIME sniffing
   - **Impacto:** Alto
   - **Localização:** `next.config.ts`

2. **Ausência de Rate Limiting**
   - **Risco:** Brute force, DDoS, abuso de API
   - **Impacto:** Alto
   - **Localização:** Todas as rotas API

3. **Validação de Entrada Insuficiente no Backend**
   - **Risco:** Injection, data corruption
   - **Impacto:** Alto
   - **Localização:** Rotas API

4. **Exposição de Informações em Logs**
   - **Risco:** Vazamento de dados sensíveis
   - **Impacto:** Médio-Alto
   - **Localização:** Múltiplos arquivos

5. **Falta de CSRF Protection**
   - **Risco:** Ataques CSRF
   - **Impacto:** Médio-Alto
   - **Localização:** Rotas POST/PUT/DELETE

#### 🟡 MÉDIO (Corrigir em Breve)

6. **Configurações Next.js Permissivas**
   - `eslint.ignoreDuringBuilds: true`
   - `typescript.ignoreBuildErrors: true`
   - **Risco:** Bugs em produção

7. **Falta de Validação de Token de Convite no Backend**
   - **Risco:** Reutilização de tokens
   - **Localização:** `api/invites/verify-token`

8. **Busca Flexível de Token (O->0)**
   - **Risco:** Colisão de tokens
   - **Localização:** `api/invites/verify-token`

9. **Criptografia Client-Side (sessionStorage)**
   - **Risco:** Chave exposta no navegador
   - **Localização:** `lib/encryption.ts`

10. **Falta de Content Security Policy (CSP)**
    - **Risco:** XSS avançado

---

## 🔧 CORREÇÕES PRIORITÁRIAS

### 1. Headers de Segurança HTTP

**Arquivo:** `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ltsbfcnlfpzsbfqwmazx.supabase.co",
        pathname: "/storage/v1/object/public/company-logos/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 2. Rate Limiting

**Criar:** `src/lib/rateLimit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

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
    // Identificar por IP + email (se disponível)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    try {
      const body = req.clone();
      // Nota: Em produção, use um middleware que parse o body uma vez
      return ip;
    } catch {
      return ip;
    }
  },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 60, // 60 requisições por minuto
});
```

**Aplicar em rotas sensíveis:**

```typescript
// Exemplo: src/app/api/users/create/route.ts
import { authRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // ... resto do código
}
```

### 3. Validação de Entrada Robusta

**Criar:** `src/lib/validation.ts`

```typescript
import { z } from 'zod';

// Schemas de validação
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  'Senha deve conter: minúscula, maiúscula, número e símbolo'
);

export const userIdSchema = z.string().uuid();
export const phoneSchema = z.string().regex(/^\d{10,15}$/);
export const tokenSchema = z.string().min(32).max(128);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userId: userIdSchema.optional(),
  inviteId: z.string().uuid().optional(),
  token: tokenSchema.optional(),
});

export const updateUserSchema = z.object({
  userId: userIdSchema,
  full_name: z.string().max(255).optional(),
  role: z.enum(['admin', 'manager', 'seller', 'finance', 'leader', 'owner']).optional(),
  network_id: z.string().uuid().nullable().optional(),
  store_id: z.string().uuid().nullable().optional(),
});

export const deleteUserSchema = z.object({
  userId: userIdSchema,
});

export const toggleActiveSchema = z.object({
  userId: userIdSchema,
  isActive: z.boolean(),
});

export const zapiSendSchema = z.object({
  phone: phoneSchema,
  message: z.string().min(1).max(4096),
  instanceId: z.string().optional(),
  token: z.string().optional(),
  clientToken: z.string().optional(),
});

// Helper para validar e retornar erro formatado
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        error: `Validação falhou: ${messages}`,
        status: 400,
      };
    }
    return {
      success: false,
      error: 'Erro de validação desconhecido',
      status: 400,
    };
  }
}
```

**Instalar Zod:**
```bash
npm install zod
```

### 4. Sanitização de Logs

**Criar:** `src/lib/safeLogger.ts`

```typescript
// Logger seguro que remove dados sensíveis

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'clientToken',
  'client_token',
  'access_token',
  'refresh_token',
  'authorization',
  'apiKey',
  'secret',
  'creditCard',
  'cvv',
];

function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return '[Max Depth]'; // Prevenir recursão infinita
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export const safeLogger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(...args.map(arg => 
        typeof arg === 'object' ? sanitizeObject(arg) : arg
      ));
    } else {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    ));
  },
  warn: (...args: any[]) => {
    console.warn(...args.map(arg => 
      typeof arg === 'object' ? sanitizeObject(arg) : arg
    ));
  },
};
```

### 5. CSRF Protection

**Criar:** `src/lib/csrf.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Em produção, use um secret armazenado em env
const CSRF_SECRET = process.env.CSRF_SECRET || 'change-me-in-production';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken?: string): boolean {
  // Implementação básica: em produção, valide contra sessão do usuário
  // Por enquanto, apenas verifica formato
  return /^[a-f0-9]{64}$/.test(token);
}

export function csrfProtection() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Apenas para métodos que modificam dados
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return null;
    }

    // Verificar header CSRF
    const csrfToken = req.headers.get('x-csrf-token');
    
    if (!csrfToken) {
      return NextResponse.json(
        { error: 'CSRF token ausente' },
        { status: 403 }
      );
    }

    // Em produção, valide contra sessão do usuário
    // Por enquanto, apenas verifica formato
    if (!validateCSRFToken(csrfToken)) {
      return NextResponse.json(
        { error: 'CSRF token inválido' },
        { status: 403 }
      );
    }

    return null;
  };
}
```

### 6. Content Security Policy (CSP)

**Adicionar ao `next.config.ts`:**

```typescript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Ajustar conforme necessário
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.z-api.io",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Prioridade Alta (Esta Semana)
- [ ] Adicionar headers de segurança HTTP
- [ ] Implementar rate limiting nas rotas de autenticação
- [ ] Adicionar validação de entrada com Zod
- [ ] Sanitizar logs em produção
- [ ] Implementar CSRF protection básico

### Prioridade Média (Próximas 2 Semanas)
- [ ] Revisar e fortalecer validação de tokens de convite
- [ ] Mover criptografia para servidor (não usar sessionStorage)
- [ ] Adicionar Content Security Policy
- [ ] Implementar rate limiting em todas as rotas API
- [ ] Adicionar monitoramento de tentativas de ataque

### Prioridade Baixa (Próximo Mês)
- [ ] Configurar WAF (Web Application Firewall) na Vercel
- [ ] Implementar logging estruturado (ex: Sentry)
- [ ] Adicionar testes de segurança automatizados
- [ ] Revisar dependências com `npm audit`
- [ ] Documentar procedimentos de resposta a incidentes

---

## 🔍 ANÁLISE DETALHADA POR COMPONENTE

### Backend (API Routes)

#### ✅ Pontos Positivos
- Service Role Key apenas no servidor
- Verificação de admin implementada
- Uso de Supabase (proteção contra SQL injection)
- Tokens não expostos em logs

#### ⚠️ Melhorias Necessárias
1. **Validação de entrada:** Adicionar Zod em todas as rotas
2. **Rate limiting:** Implementar em todas as rotas
3. **Error handling:** Não expor stack traces em produção
4. **Logging:** Usar safeLogger em todos os lugares

### Frontend

#### ✅ Pontos Positivos
- ProtectedRoute implementado
- Validação de senha forte
- Uso de Supabase Auth (JWT)

#### ⚠️ Melhorias Necessárias
1. **Criptografia:** Mover para servidor
2. **XSS:** Adicionar sanitização de inputs
3. **CSP:** Implementar Content Security Policy
4. **Tokens:** Não armazenar tokens sensíveis no sessionStorage

### Banco de Dados (Supabase)

#### ✅ Pontos Positivos
- RLS (Row Level Security) ativo
- Queries parametrizadas (Supabase client)

#### ⚠️ Verificações Necessárias
1. **Policies RLS:** Revisar todas as policies
2. **Índices:** Garantir índices em campos de busca
3. **Backups:** Configurar backups automáticos
4. **Auditoria:** Habilitar logging de queries sensíveis

---

## 🛡️ RECOMENDAÇÕES ADICIONAIS

### Monitoramento
- Configurar alertas para tentativas de brute force
- Monitorar rate limit hits
- Logar todas as operações administrativas

### Backup e Recuperação
- Configurar backups automáticos do Supabase
- Testar processo de restauração
- Documentar procedimentos de emergência

### Compliance
- Revisar LGPD (se aplicável)
- Documentar tratamento de dados pessoais
- Implementar consentimento explícito onde necessário

---

## 📚 REFERÊNCIAS

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Zod Documentation](https://zod.dev/)

---

**Próximos Passos:** Implementar correções de Prioridade Alta nesta semana.

