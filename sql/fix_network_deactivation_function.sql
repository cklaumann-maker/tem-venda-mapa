-- Script para corrigir a função de obter usuários afetados por desativação de rede
-- Execute este script no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_users_affected_by_network_deactivation(
  p_network_id UUID
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  current_network_id UUID,
  current_store_id UUID,
  has_other_networks BOOLEAN,
  has_other_stores BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS user_id,
    ''::TEXT AS email, -- Email será obtido via API se necessário
    p.full_name,
    p.role,
    COALESCE(p.network_id, p.org_id) AS current_network_id,
    p.default_store_id AS current_store_id,
    false AS has_other_networks, -- Simplificado por enquanto
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id IS DISTINCT FROM p.default_store_id
        AND (s.network_id = p_network_id OR s.org_id = p_network_id)
        AND COALESCE(s.is_active, true) = true
    ) AS has_other_stores
  FROM public.profiles p
  WHERE (p.network_id = p_network_id OR p.org_id = p_network_id)
    AND COALESCE(p.is_active, true) = true
    AND p.deleted_at IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Retornar vazio em caso de falha
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

