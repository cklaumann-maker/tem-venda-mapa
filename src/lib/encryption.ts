/**
 * Utilitário de criptografia simples para proteger dados sensíveis
 * Usa Web Crypto API do navegador
 */

const ENCRYPTION_KEY_NAME = 'zapi_encryption_key';

/**
 * Gera ou recupera uma chave de criptografia
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Tenta recuperar do sessionStorage
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (storedKey) {
    // Importa a chave existente
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Gera uma nova chave
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Salva no sessionStorage (apenas durante a sessão)
  const keyData = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(keyData));

  return key;
}

/**
 * Criptografa um texto
 */
export async function encrypt(text: string): Promise<string> {
  if (!text) return '';
  
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Gera IV aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Criptografa
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combina IV + dados criptografados e converte para base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    throw new Error('Falha ao criptografar dados');
  }
}

/**
 * Descriptografa um texto
 */
export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) return '';
  
  try {
    const key = await getEncryptionKey();
    
    // Decodifica base64
    const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

    // Separa IV e dados criptografados
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Descriptografa
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    // Converte para string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar dados');
  }
}

/**
 * Limpa a chave de criptografia da sessão
 */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
}

