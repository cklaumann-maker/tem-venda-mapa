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

