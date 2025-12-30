/**
 * Error Handler - Centralizado e seguindo boas práticas de Big Techs
 * 
 * Princípios:
 * 1. Separação entre erros do usuário e erros técnicos
 * 2. Logging estruturado para debugging
 * 3. Tradução centralizada
 * 4. Tipagem TypeScript adequada
 * 5. Contexto útil para debugging
 */

import { safeLogger } from './safeLogger';

// ==================== Tipos ====================

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  userId?: string;
  email?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuredError {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError?: unknown;
  context?: ErrorContext;
  timestamp: string;
}

// ==================== Mapeamento de Erros ====================

const ERROR_TRANSLATIONS: Record<string, { userMessage: string; category: ErrorCategory; severity: ErrorSeverity }> = {
  // Autenticação
  'Invalid login credentials': {
    userMessage: 'Credenciais de login inválidas',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  'Email not confirmed': {
    userMessage: 'E-mail não confirmado. Verifique sua caixa de entrada.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  'User not found': {
    userMessage: 'Usuário não encontrado',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  'Invalid password': {
    userMessage: 'Senha inválida',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  'Too many requests': {
    userMessage: 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  'Email rate limit exceeded': {
    userMessage: 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
  },
  
  // Rede
  'Network request failed': {
    userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
  },
  'Failed to fetch': {
    userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
  },
  'NetworkError': {
    userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
  },
  
  // Validação
  'Validation error': {
    userMessage: 'Dados inválidos. Verifique os campos e tente novamente.',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
  },
  
  // Servidor
  'Internal server error': {
    userMessage: 'Erro interno do servidor. Tente novamente mais tarde.',
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
  },
};

// ==================== Funções Principais ====================

/**
 * Processa e estrutura um erro para exibição ao usuário e logging
 */
export function handleError(
  error: unknown,
  context?: ErrorContext
): StructuredError {
  const timestamp = new Date().toISOString();
  
  // Extrair mensagem do erro
  let errorMessage = 'Erro desconhecido';
  let errorCode = 'UNKNOWN_ERROR';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    errorCode = error.name || 'ERROR';
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorCode = 'STRING_ERROR';
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
    errorCode = 'OBJECT_ERROR';
  }
  
  // Buscar tradução e metadados
  const translation = ERROR_TRANSLATIONS[errorMessage] || {
    userMessage: errorMessage,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
  };
  
  const structuredError: StructuredError = {
    code: errorCode,
    message: errorMessage,
    userMessage: translation.userMessage,
    category: translation.category,
    severity: translation.severity,
    originalError: error,
    context,
    timestamp,
  };
  
  // Log estruturado (seguindo padrão de Big Techs)
  logError(structuredError);
  
  return structuredError;
}

/**
 * Loga erro de forma estruturada para debugging
 */
function logError(error: StructuredError): void {
  const logData = {
    error: {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      timestamp: error.timestamp,
    },
    context: error.context,
    // Stack trace apenas em desenvolvimento ou para erros críticos
    stack: error.originalError instanceof Error && 
           (process.env.NODE_ENV === 'development' || error.severity === ErrorSeverity.CRITICAL)
      ? error.originalError.stack
      : undefined,
  };
  
  // Usar safeLogger para sanitizar dados sensíveis
  if (error.severity === ErrorSeverity.CRITICAL) {
    safeLogger.error('🚨 [CRITICAL ERROR]', logData);
  } else if (error.severity === ErrorSeverity.HIGH) {
    safeLogger.error('❌ [HIGH SEVERITY ERROR]', logData);
  } else {
    safeLogger.warn('⚠️ [ERROR]', logData);
  }
}

/**
 * Retorna apenas a mensagem amigável para o usuário
 */
export function getUserErrorMessage(error: unknown, context?: ErrorContext): string {
  return handleError(error, context).userMessage;
}

/**
 * Verifica se o erro é de uma categoria específica
 */
export function isErrorCategory(
  error: unknown,
  category: ErrorCategory
): boolean {
  try {
    const structured = handleError(error);
    return structured.category === category;
  } catch {
    return false;
  }
}

/**
 * Verifica se o erro requer ação imediata (alta severidade)
 */
export function requiresImmediateAction(error: unknown): boolean {
  try {
    const structured = handleError(error);
    return structured.severity === ErrorSeverity.CRITICAL || 
           structured.severity === ErrorSeverity.HIGH;
  } catch {
    return false;
  }
}

