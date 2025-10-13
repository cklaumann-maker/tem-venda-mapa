import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton preguiçoso do Supabase.
 * - supabaseClient() -> retorna o cliente (inicializa na 1ª chamada)
 * - supabase         -> cliente pronto (compatibilidade com código antigo)
 */
let _client: SupabaseClient | null = null;

export function supabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const hint = [
      "Supabase URL/Key ausentes (.env.local).",
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na raiz do projeto e reinicie o servidor.",
    ].join("\n");
    if (typeof window !== "undefined") console.error(hint);
    throw new Error(hint);
  }
  _client = createClient(url, key, { auth: { persistSession: true } });
  return _client;
}

export const supabase: SupabaseClient = (() => supabaseClient())();
