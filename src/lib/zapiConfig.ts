"use client";

import { supabaseClient } from "@/lib/supabaseClient";
import { decrypt } from "@/lib/encryption";

export interface ZApiConfig {
  id?: string;
  instance_id: string;
  token: string;
  client_token_encrypted?: string;
  manager_phone: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Carrega a configuração Z-API do banco de dados
 */
export async function loadZApiConfig(): Promise<ZApiConfig | null> {
  try {
    // Verifica se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Se não houver variáveis configuradas, retorna null silenciosamente
    if (!supabaseUrl || !supabaseKey || supabaseUrl.length === 0 || supabaseKey.length === 0) {
      return null;
    }

    // Tenta criar o cliente Supabase
    let supabase;
    try {
      supabase = supabaseClient();
    } catch (clientError: any) {
      // Se houver erro ao criar cliente (ex: variáveis inválidas), retorna null
      console.warn("Não foi possível criar cliente Supabase:", clientError?.message || clientError);
      return null;
    }
    
    // Verifica se o cliente foi criado corretamente
    if (!supabase) {
      return null;
    }

    // Tenta buscar dados do banco
    const { data, error } = await supabase
      .from("zapi_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(); // Usa maybeSingle() ao invés de single() para retornar null quando não houver resultado

    if (error) {
      // Se não encontrar registro (PGRST116), retorna null (comportamento esperado)
      if (error.code === "PGRST116") {
        return null;
      }
      
      // Se for erro de autenticação/chave API, retorna null silenciosamente
      if (error.message?.includes("API key") || error.message?.includes("apikey") || error.hint?.includes("apikey")) {
        console.warn("Supabase não configurado corretamente. Verifique as variáveis de ambiente.");
        return null;
      }
      
      // Outros erros são logados mas não bloqueiam
      console.warn("Erro ao carregar configuração Z-API:", error.message || error);
      return null;
    }

    return data as ZApiConfig | null;
  } catch (error: any) {
    // Trata qualquer erro como "não disponível" e retorna null
    // Não loga o erro completo para não poluir o console
    if (error?.message?.includes("API key") || error?.message?.includes("apikey")) {
      // Erro de chave API - ignora silenciosamente
      return null;
    }
    
    // Outros erros - apenas loga um aviso
    if (error?.code !== "PGRST116") {
      console.warn("Não foi possível carregar configuração Z-API do banco de dados.");
    }
    
    return null;
  }
}

/**
 * Salva a configuração Z-API no banco de dados
 */
export async function saveZApiConfig(
  config: Omit<ZApiConfig, "id" | "created_at" | "updated_at">
): Promise<ZApiConfig> {
  try {
    // Verifica se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.length === 0 || supabaseKey.length === 0) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local");
    }

    // Tenta criar o cliente Supabase
    let supabase;
    try {
      supabase = supabaseClient();
    } catch (clientError: any) {
      throw new Error(`Erro ao criar cliente Supabase: ${clientError?.message || "Verifique se as variáveis de ambiente estão configuradas corretamente"}`);
    }
    
    // Verifica se o cliente foi criado corretamente
    if (!supabase) {
      throw new Error("Erro ao criar cliente Supabase");
    }
    
    // Verifica se já existe uma configuração
    const existing = await loadZApiConfig();

    let result;
    if (existing) {
      // Atualiza configuração existente
      const { data, error } = await supabase
        .from("zapi_config")
        .update({
          instance_id: config.instance_id,
          token: config.token,
          client_token_encrypted: config.client_token_encrypted,
          manager_phone: config.manager_phone,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Cria nova configuração
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user;

      const { data, error } = await supabase
        .from("zapi_config")
        .insert({
          instance_id: config.instance_id,
          token: config.token,
          client_token_encrypted: config.client_token_encrypted || null,
          manager_phone: config.manager_phone,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result as ZApiConfig;
  } catch (error) {
    console.error("Erro ao salvar configuração Z-API:", error);
    throw error;
  }
}

/**
 * Descriptografa o client-token (se necessário)
 */
export async function getDecryptedClientToken(
  encryptedToken: string | null | undefined
): Promise<string | null> {
  if (!encryptedToken) return null;

  try {
    return await decrypt(encryptedToken);
  } catch (error) {
    // Não logar o erro completo para evitar exposição de dados sensíveis
    console.error("Erro ao descriptografar client-token");
    return null;
  }
}

/**
 * Valida os campos da configuração Z-API
 */
export function validateZApiConfig(config: Partial<ZApiConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.instance_id || config.instance_id.trim().length === 0) {
    errors.push("Instância Z-API é obrigatória");
  } else if (config.instance_id.length < 10) {
    errors.push("Instância Z-API parece estar inválida");
  }

  if (!config.token || config.token.trim().length === 0) {
    errors.push("Token Z-API é obrigatório");
  } else if (config.token.length < 10) {
    errors.push("Token Z-API parece estar inválido");
  }

  // Client-Token é obrigatório
  if (!config.client_token_encrypted || config.client_token_encrypted.trim().length === 0) {
    errors.push("Client-Token Z-API é obrigatório");
  } else if (config.client_token_encrypted.length < 10) {
    errors.push("Client-Token Z-API parece estar inválido");
  }

  if (config.manager_phone && config.manager_phone.length > 0) {
    // Valida formato básico do telefone (apenas dígitos)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(config.manager_phone.replace(/\D/g, ""))) {
      errors.push("Número de WhatsApp deve conter apenas dígitos (10-15 caracteres)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

