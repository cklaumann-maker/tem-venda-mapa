/**
 * Utilitários de segurança para senhas
 * Implementa comparação constante de tempo para prevenir timing attacks
 */

/**
 * Compara duas strings de forma constante (timing-safe)
 * Previne ataques de timing que poderiam revelar diferenças entre senhas
 * 
 * @param a Primeira string
 * @param b Segunda string
 * @returns true se as strings forem iguais, false caso contrário
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Se os tamanhos são diferentes, retorna false imediatamente
  // (mas ainda fazemos a comparação para manter tempo constante)
  if (a.length !== b.length) {
    // Fazer comparação mesmo assim para manter tempo constante
    let dummy = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const charA = i < a.length ? a.charCodeAt(i) : 0;
      const charB = i < b.length ? b.charCodeAt(i) : 0;
      dummy |= charA ^ charB;
    }
    return false;
  }

  // Comparação bit a bit com XOR
  // Se qualquer bit for diferente, result será diferente de zero
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  // Retorna true apenas se result for zero (strings idênticas)
  return result === 0;
}

/**
 * Sanitiza uma senha removendo caracteres de controle e normalizando
 * Remove caracteres de controle (0x00-0x1F, 0x7F) e espaços no início/fim
 * 
 * @param password Senha a ser sanitizada
 * @returns Senha sanitizada
 */
export function sanitizePassword(password: string): string {
  if (!password) return '';
  
  return password
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim(); // Remove espaços no início e fim
}

