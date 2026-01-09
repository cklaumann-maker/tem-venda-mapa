import { z } from 'zod';

// Schemas de validação
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_])[A-Za-z\d@$!%*?&\-_]/,
  'Senha deve conter: minúscula, maiúscula, número e símbolo'
);

export const userIdSchema = z.string().uuid();
export const phoneSchema = z.string().regex(/^\d{10,15}$/);
export const tokenSchema = z.string().min(32).max(128);

// ============================================
// VALIDAÇÕES PARA REDES E LOJAS
// Conforme ESPECIFICACAO_CAMPOS_REDES_LOJAS.md
// ============================================

/**
 * Valida CNPJ (14 dígitos com dígitos verificadores)
 * Remove formatação e valida formato e dígitos verificadores
 */
function validateCNPJ(cnpj: string): boolean {
  // Remove formatação (pontos, barras, hífens)
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  // Deve ter exatamente 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  // Valida dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Schema Zod para CNPJ (obrigatório)
 */
export const cnpjSchema = z.string()
  .min(1, "CNPJ é obrigatório")
  .refine(
    (cnpj) => validateCNPJ(cnpj),
    { message: "CNPJ inválido. Verifique os dígitos verificadores." }
  );

/**
 * Schema Zod para CNPJ (opcional - para redes)
 */
export const cnpjOptionalSchema = z.string()
  .optional()
  .refine(
    (cnpj) => {
      if (!cnpj || cnpj.trim() === '') return true; // Vazio é válido (opcional)
      return validateCNPJ(cnpj);
    },
    { message: "CNPJ inválido. Verifique os dígitos verificadores." }
  );

/**
 * Valida CPF (11 dígitos com dígitos verificadores)
 * Remove formatação e valida formato e dígitos verificadores
 */
function validateCPF(cpf: string): boolean {
  // Remove formatação (pontos, hífens)
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Deve ter exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Valida dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Valida primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

/**
 * Schema Zod para CPF (obrigatório)
 */
export const cpfSchema = z.string()
  .min(1, "CPF é obrigatório")
  .refine(
    (cpf) => validateCPF(cpf),
    { message: "CPF inválido. Verifique os dígitos verificadores." }
  );

/**
 * Valida CEP (8 dígitos numéricos)
 */
export const cepSchema = z.string()
  .min(1, "CEP é obrigatório")
  .transform((cep) => cep.replace(/[^\d]/g, '')) // Remove formatação primeiro
  .refine(
    (cep) => /^\d{8}$/.test(cep),
    { message: "CEP deve conter exatamente 8 dígitos numéricos" }
  );

/**
 * Valida telefone brasileiro
 * Aceita formatos: (11) 99999-9999, 11999999999, +5511999999999
 * Normaliza removendo formatação e código do país
 */
export const brazilianPhoneSchema = z.string()
  .min(1, "Telefone é obrigatório")
  .transform((phone) => {
    // Remove tudo exceto dígitos e +
    const withPlus = phone.replace(/[^\d+]/g, '');
    // Remove +55 (código do país) se presente no início
    const withoutCountry = withPlus.startsWith('+55') 
      ? withPlus.substring(3) 
      : (withPlus.startsWith('55') && withPlus.length > 11
          ? withPlus.substring(2)
          : withPlus);
    // Retorna apenas dígitos
    return withoutCountry.replace(/[^\d]/g, '');
  })
  .refine(
    (phone) => {
      // Deve ter 10 ou 11 dígitos (DDD + número: 10 para fixo, 11 para celular)
      return phone.length >= 10 && phone.length <= 11;
    },
    { message: "Telefone inválido. Use formato: (11) 99999-9999 ou 11999999999" }
  );

/**
 * Valida estado brasileiro (UF) - 2 letras maiúsculas
 */
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export const stateSchema = z.string()
  .min(1, "Estado (UF) é obrigatório")
  .length(2, "Estado deve ter 2 caracteres")
  .refine(
    (state) => BRAZILIAN_STATES.includes(state.toUpperCase() as typeof BRAZILIAN_STATES[number]),
    { message: "Estado inválido. Use a sigla da UF (ex: SP, RJ, MG)" }
  )
  .transform((state) => state.toUpperCase());

/**
 * Valida cidade (2-100 caracteres)
 */
export const citySchema = z.string()
  .min(2, "Cidade deve ter no mínimo 2 caracteres")
  .max(100, "Cidade deve ter no máximo 100 caracteres")
  .trim();

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userId: userIdSchema.optional(),
  inviteId: z.string().uuid().optional(),
  token: tokenSchema.optional(),
  inviteData: z.any().optional(), // Dados do convite podem variar
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

export const verifyTokenSchema = z.object({
  token: tokenSchema,
});

export const getEmailsSchema = z.object({
  userIds: z.array(userIdSchema).min(1).max(1000),
});

// ============================================
// SCHEMAS PARA CRIAÇÃO DE REDES E LOJAS
// ============================================

/**
 * Schema para dados do proprietário da rede
 * Conforme ANALISE_PROPRietARIO_REDE.md
 */
export const ownerDataSchema = z.object({
  // Campos obrigatórios
  full_name: z.string().min(2, "Nome completo deve ter no mínimo 2 caracteres").max(255, "Nome completo deve ter no máximo 255 caracteres").trim(),
  email: emailSchema,
  phone: brazilianPhoneSchema,
  cpf: cpfSchema,
  password: passwordSchema,
  password_confirm: z.string(),
  // Campos obrigatórios
  birth_date: z.string().date("Data de nascimento deve estar no formato YYYY-MM-DD"),
  // Campos opcionais
  photo_url: z.string().url().optional(),
}).refine((data) => data.password === data.password_confirm, {
  message: "As senhas não coincidem",
  path: ["password_confirm"],
});

/**
 * Schema para criação de rede (incluindo proprietário)
 * Conforme ESPECIFICACAO_CAMPOS_REDES_LOJAS.md e ANALISE_PROPRietARIO_REDE.md
 */
export const createNetworkSchema = z.object({
  // Dados do proprietário (obrigatório)
  owner: ownerDataSchema,
  
  // Campos obrigatórios da rede
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(255, "Nome deve ter no máximo 255 caracteres").trim(),
  primary_email: emailSchema,
  primary_phone: brazilianPhoneSchema,
  zip_code: cepSchema,
  state: stateSchema,
  city: citySchema,
  
  // Campos obrigatórios - Logo e Endereço Completo
  logo_url: z.string().url("URL do logo deve ser válida"),
  street: z.string().min(1, "Logradouro é obrigatório").max(255, "Logradouro deve ter no máximo 255 caracteres").trim(),
  street_number: z.string().min(1, "Número é obrigatório").max(20, "Número deve ter no máximo 20 caracteres").trim(),
  neighborhood: z.string().min(1, "Bairro é obrigatório").max(100, "Bairro deve ter no máximo 100 caracteres").trim(),
  
  // Campos opcionais - Dados Básicos
  trade_name: z.string().max(255).trim().optional(),
  cnpj: cnpjOptionalSchema,
  company_name: z.string().max(255).trim().optional(),
  state_registration: z.string().max(50).trim().optional(),
  municipal_registration: z.string().max(50).trim().optional(),
  website: z.string().url().optional(),
  
  // Endereço Completo - Complemento (opcional)
  address_complement: z.string().max(100).trim().optional(),
  
  // Métricas Operacionais
  founded_at: z.string().date().optional(),
  estimated_store_count: z.number().int().positive().optional(),
  monthly_revenue_target: z.number().int().nonnegative().optional(),
  avg_employees_per_store: z.number().int().positive().optional(),
  market_segment: z.enum(['farmacia', 'supermercado', 'varejo', 'outro']).optional(),
  business_model: z.enum(['franquia', 'propria', 'mista']).optional(),
  
  // Configurações Financeiras
  currency: z.string().default('BRL'),
  fiscal_month_end_day: z.number().int().min(1).max(31).optional(),
  primary_bank_code: z.string().max(10).trim().optional(),
  
  // Integrações
  erp_integration: z.boolean().default(false),
  erp_type: z.string().max(100).trim().optional(),
  
  // Outros
  internal_notes: z.string().max(5000).trim().optional(),
  tags: z.array(z.string().max(50)).optional(),
}).refine(
  (data) => {
    // Se cnpj for fornecido, company_name também deve ser fornecido
    if (data.cnpj && !data.company_name) {
      return false;
    }
    return true;
  },
  {
    message: "Se CNPJ for fornecido, Razão Social (company_name) também deve ser fornecido",
    path: ["company_name"],
  }
);

/**
 * Schema para criação de loja
 * Conforme ESPECIFICACAO_CAMPOS_REDES_LOJAS.md
 */
export const createStoreSchema = z.object({
  // Campos obrigatórios
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(255, "Nome deve ter no máximo 255 caracteres").trim(),
  network_id: z.string().uuid("network_id deve ser um UUID válido"),
  cnpj: cnpjSchema,
  company_name: z.string().min(2, "Razão social deve ter no mínimo 2 caracteres").max(255, "Razão social deve ter no máximo 255 caracteres").trim(),
  zip_code: cepSchema,
  state: stateSchema,
  city: citySchema,
  phone: brazilianPhoneSchema,
  email: emailSchema,
  
  // Campos opcionais (pode ser expandido conforme necessário)
  logo_url: z.string().url().optional(),
  internal_code: z.string().max(50).trim().optional(),
  manager_name: z.string().max(255).trim().optional(),
  state_registration: z.string().max(50).trim().optional(),
  
  // Endereço Completo
  street: z.string().max(255).trim().optional(),
  street_number: z.string().max(20).trim().optional(),
  address_complement: z.string().max(100).trim().optional(),
  neighborhood: z.string().max(100).trim().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  
  // Operacionais
  opened_at: z.string().date().optional(),
  operational_status: z.enum(['ativa', 'em_construcao', 'em_reforma', 'temporariamente_fechada']).optional(),
  area_sqm: z.number().positive().optional(),
  employee_count: z.number().int().nonnegative().optional(),
  cash_register_count: z.number().int().nonnegative().optional(),
  business_hours: z.record(z.any()).optional(), // JSONB
  max_customer_capacity: z.number().int().positive().optional(),
  
  // Métricas de Performance
  monthly_revenue_target: z.number().int().nonnegative().optional(),
  estimated_average_ticket: z.number().int().nonnegative().optional(),
  daily_customer_target: z.number().int().positive().optional(),
  
  // Financeiro
  pos_code: z.string().max(50).trim().optional(),
  payment_settings: z.record(z.any()).optional(), // JSONB
  
  // Outros
  tags: z.array(z.string().max(50)).optional(),
  internal_notes: z.string().max(5000).trim().optional(),
  photos: z.array(z.string().url()).optional(),
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

