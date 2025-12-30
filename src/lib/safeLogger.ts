// Logger seguro que remove dados sensíveis

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'clientToken',
  'client_token',
  'access_token',
  'refresh_token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'creditCard',
  'cvv',
  'service_role_key',
  'supabase_service_role_key',
  // Dados pessoais sensíveis (LGPD)
  'cpf',
  'cnpj',
  'document',
  'document_number',
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

