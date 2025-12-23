-- ============================================================================
-- SISTEMA DE GERENCIAMENTO DE DESATIVAÇÃO DE REDES E LOJAS
-- Seguindo boas práticas de bigtechs (soft delete, auditoria, preservação)
-- ============================================================================

-- 1. Adicionar campos de desativação na tabela networks (se não existirem)
DO $$ 
BEGIN
  -- Adicionar is_active se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'networks' 
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.networks 
    ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
  END IF;

  -- Adicionar deactivated_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'networks' 
      AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE public.networks 
    ADD COLUMN deactivated_at TIMESTAMPTZ NULL;
  END IF;

  -- Adicionar deactivated_by se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'networks' 
      AND column_name = 'deactivated_by'
  ) THEN
    ALTER TABLE public.networks 
    ADD COLUMN deactivated_by UUID NULL 
    REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Adicionar campos de desativação na tabela stores (se não existirem)
DO $$ 
BEGIN
  -- Adicionar deactivated_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'stores' 
      AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN deactivated_at TIMESTAMPTZ NULL;
  END IF;

  -- Adicionar deactivated_by se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'stores' 
      AND column_name = 'deactivated_by'
  ) THEN
    ALTER TABLE public.stores 
    ADD COLUMN deactivated_by UUID NULL 
    REFERENCES auth.users(id);
  END IF;
END $$;

-- 3. Criar tabela de auditoria para desativações
CREATE TABLE IF NOT EXISTS public.deactivation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('network', 'store')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('deactivated', 'reactivated')),
  affected_users_count INTEGER DEFAULT 0,
  migration_strategy TEXT CHECK (migration_strategy IN ('none', 'auto_migrate', 'manual_review', 'deactivate_users')),
  migration_details JSONB NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT NULL,
  metadata JSONB NULL
);

COMMENT ON TABLE public.deactivation_audit IS 'Auditoria completa de todas as desativações/reativações de redes e lojas';
COMMENT ON COLUMN public.deactivation_audit.entity_type IS 'Tipo de entidade: network ou store';
COMMENT ON COLUMN public.deactivation_audit.entity_id IS 'ID da rede ou loja desativada';
COMMENT ON COLUMN public.deactivation_audit.affected_users_count IS 'Número de usuários afetados pela desativação';
COMMENT ON COLUMN public.deactivation_audit.migration_strategy IS 'Estratégia aplicada: none, auto_migrate, manual_review, deactivate_users';
COMMENT ON COLUMN public.deactivation_audit.migration_details IS 'Detalhes da migração em formato JSON';

-- 4. Criar tabela para rastrear usuários afetados por desativações
CREATE TABLE IF NOT EXISTS public.user_deactivation_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deactivation_audit_id UUID NOT NULL REFERENCES public.deactivation_audit(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('network', 'store')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  previous_network_id UUID NULL,
  previous_store_id UUID NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('migrated', 'deactivated', 'no_action', 'manual_review')),
  new_network_id UUID NULL,
  new_store_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES auth.users(id),
  notes TEXT NULL
);

COMMENT ON TABLE public.user_deactivation_impact IS 'Rastreamento de impacto de desativações em usuários individuais';
COMMENT ON COLUMN public.user_deactivation_impact.action_taken IS 'Ação tomada: migrated, deactivated, no_action, manual_review';

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_deactivation_audit_entity ON public.deactivation_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_deactivation_audit_performed_at ON public.deactivation_audit(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_deactivation_impact_user ON public.user_deactivation_impact(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deactivation_impact_audit ON public.user_deactivation_impact(deactivation_audit_id);
CREATE INDEX IF NOT EXISTS idx_user_deactivation_impact_resolved ON public.user_deactivation_impact(resolved_at) WHERE resolved_at IS NULL;

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.deactivation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deactivation_impact ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para deactivation_audit (apenas admins podem ver)
CREATE POLICY "Admins can view all deactivation audits"
  ON public.deactivation_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 8. Políticas RLS para user_deactivation_impact
-- Usuários podem ver apenas seus próprios registros
CREATE POLICY "Users can view their own deactivation impacts"
  ON public.user_deactivation_impact FOR SELECT
  USING (user_id = auth.uid());

-- Admins podem ver todos
CREATE POLICY "Admins can view all deactivation impacts"
  ON public.user_deactivation_impact FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 9. Função para contar usuários afetados por desativação de rede
CREATE OR REPLACE FUNCTION public.count_users_affected_by_network_deactivation(
  p_network_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO v_count
  FROM public.profiles p
  WHERE (p.network_id = p_network_id OR p.org_id = p_network_id)
    AND p.is_active = true
    AND p.deleted_at IS NULL;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Função para contar usuários afetados por desativação de loja
CREATE OR REPLACE FUNCTION public.count_users_affected_by_store_deactivation(
  p_store_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO v_count
  FROM public.profiles p
  WHERE p.default_store_id = p_store_id
    AND p.is_active = true
    AND p.deleted_at IS NULL;
  
  -- Também contar membros da loja
  SELECT v_count + COUNT(DISTINCT sm.user_id) INTO v_count
  FROM public.store_members sm
  WHERE sm.store_id = p_store_id
    AND sm.active = true;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Função para obter usuários afetados por desativação de rede
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
    -- Retornar erro vazio em caso de falha
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Função para obter usuários afetados por desativação de loja
CREATE OR REPLACE FUNCTION public.get_users_affected_by_store_deactivation(
  p_store_id UUID
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  current_network_id UUID,
  current_store_id UUID,
  has_other_stores_in_network BOOLEAN
) AS $$
DECLARE
  v_network_id UUID;
BEGIN
  -- Obter network_id da loja
  SELECT COALESCE(s.network_id, s.org_id) INTO v_network_id
  FROM public.stores s
  WHERE s.id = p_store_id;
  
  RETURN QUERY
  SELECT DISTINCT
    p.id AS user_id,
    u.email::TEXT,
    p.full_name,
    p.role,
    COALESCE(p.network_id, p.org_id) AS current_network_id,
    p.default_store_id AS current_store_id,
    EXISTS (
      SELECT 1 FROM public.stores s2
      WHERE (s2.network_id = v_network_id OR s2.org_id = v_network_id)
        AND s2.id != p_store_id
        AND s2.is_active = true
    ) AS has_other_stores_in_network
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.default_store_id = p_store_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
  
  UNION
  
  SELECT DISTINCT
    u.id AS user_id,
    u.email::TEXT,
    p.full_name,
    p.role,
    COALESCE(p.network_id, p.org_id) AS current_network_id,
    NULL::UUID AS current_store_id,
    EXISTS (
      SELECT 1 FROM public.stores s2
      WHERE (s2.network_id = v_network_id OR s2.org_id = v_network_id)
        AND s2.id != p_store_id
        AND s2.is_active = true
    ) AS has_other_stores_in_network
  FROM public.store_members sm
  JOIN auth.users u ON u.id = sm.user_id
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE sm.store_id = p_store_id
    AND sm.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

