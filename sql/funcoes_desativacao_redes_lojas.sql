-- ============================================================================
-- FUNÇÕES DE DESATIVAÇÃO DE REDES E LOJAS
-- Implementa lógica de migração automática e tratamento de usuários
-- ============================================================================

-- Função principal para desativar uma rede
CREATE OR REPLACE FUNCTION public.deactivate_network(
  p_network_id UUID,
  p_performed_by UUID,
  p_migration_strategy TEXT DEFAULT 'auto_migrate',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_network_name TEXT;
  v_affected_count INTEGER;
  v_audit_id UUID;
  v_migration_details JSONB := '{}'::JSONB;
  v_result JSONB;
BEGIN
  -- Verificar se a rede existe e está ativa
  SELECT name INTO v_network_name
  FROM public.networks
  WHERE id = p_network_id;
  
  IF v_network_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rede não encontrada'
    );
  END IF;
  
  -- Contar usuários afetados
  v_affected_count := public.count_users_affected_by_network_deactivation(p_network_id);
  
  -- Aplicar estratégia de migração
  IF p_migration_strategy = 'auto_migrate' THEN
    -- Tentar migrar usuários para outra rede ativa (se houver)
    -- Por enquanto, apenas desativamos os usuários
    -- Em uma implementação completa, poderíamos migrar para uma rede padrão
    UPDATE public.profiles
    SET is_active = false
    WHERE (network_id = p_network_id OR org_id = p_network_id)
      AND is_active = true
      AND deleted_at IS NULL;
    
    v_migration_details := jsonb_build_object(
      'users_deactivated', v_affected_count,
      'strategy', 'auto_migrate'
    );
  ELSIF p_migration_strategy = 'deactivate_users' THEN
    UPDATE public.profiles
    SET is_active = false
    WHERE (network_id = p_network_id OR org_id = p_network_id)
      AND is_active = true
      AND deleted_at IS NULL;
    
    v_migration_details := jsonb_build_object(
      'users_deactivated', v_affected_count,
      'strategy', 'deactivate_users'
    );
  END IF;
  
  -- Desativar a rede
  UPDATE public.networks
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivated_by = p_performed_by,
    updated_at = now()
  WHERE id = p_network_id;
  
  -- Desativar todas as lojas da rede
  UPDATE public.stores
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivated_by = p_performed_by
  WHERE (network_id = p_network_id OR org_id = p_network_id)
    AND is_active = true;
  
  -- Criar registro de auditoria
  INSERT INTO public.deactivation_audit (
    entity_type,
    entity_id,
    entity_name,
    action,
    affected_users_count,
    migration_strategy,
    migration_details,
    performed_by,
    notes
  ) VALUES (
    'network',
    p_network_id,
    v_network_name,
    'deactivated',
    v_affected_count,
    p_migration_strategy,
    v_migration_details,
    p_performed_by,
    p_notes
  ) RETURNING id INTO v_audit_id;
  
  -- Registrar impacto em cada usuário afetado
  INSERT INTO public.user_deactivation_impact (
    user_id,
    deactivation_audit_id,
    entity_type,
    entity_id,
    entity_name,
    previous_network_id,
    previous_store_id,
    action_taken
  )
  SELECT 
    p.id,
    v_audit_id,
    'network',
    p_network_id,
    v_network_name,
    COALESCE(p.network_id, p.org_id),
    p.default_store_id,
    CASE 
      WHEN p_migration_strategy = 'auto_migrate' OR p_migration_strategy = 'deactivate_users' THEN 'deactivated'
      ELSE 'manual_review'
    END
  FROM public.profiles p
  WHERE (p.network_id = p_network_id OR p.org_id = p_network_id)
    AND p.is_active = false
    AND p.deleted_at IS NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'network_id', p_network_id,
    'network_name', v_network_name,
    'affected_users', v_affected_count,
    'migration_strategy', p_migration_strategy
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função principal para desativar uma loja
CREATE OR REPLACE FUNCTION public.deactivate_store(
  p_store_id UUID,
  p_performed_by UUID,
  p_migration_strategy TEXT DEFAULT 'auto_migrate',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_store_name TEXT;
  v_network_id UUID;
  v_affected_count INTEGER;
  v_audit_id UUID;
  v_migration_details JSONB := '{}'::JSONB;
  v_alternative_store_id UUID;
BEGIN
  -- Verificar se a loja existe e está ativa
  SELECT name, COALESCE(network_id, org_id) INTO v_store_name, v_network_id
  FROM public.stores
  WHERE id = p_store_id;
  
  IF v_store_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Loja não encontrada'
    );
  END IF;
  
  -- Contar usuários afetados
  v_affected_count := public.count_users_affected_by_store_deactivation(p_store_id);
  
  -- Aplicar estratégia de migração
  IF p_migration_strategy = 'auto_migrate' THEN
    -- Tentar encontrar outra loja ativa na mesma rede
    SELECT s.id INTO v_alternative_store_id
    FROM public.stores s
    WHERE (s.network_id = v_network_id OR s.org_id = v_network_id)
      AND s.id != p_store_id
      AND s.is_active = true
    ORDER BY s.created_at ASC
    LIMIT 1;
    
    IF v_alternative_store_id IS NOT NULL THEN
      -- Migrar usuários para a loja alternativa
      UPDATE public.profiles
      SET default_store_id = v_alternative_store_id
      WHERE default_store_id = p_store_id
        AND is_active = true
        AND deleted_at IS NULL;
      
      -- Migrar membros da loja
      UPDATE public.store_members
      SET store_id = v_alternative_store_id
      WHERE store_id = p_store_id
        AND active = true;
      
      v_migration_details := jsonb_build_object(
        'users_migrated', (
          SELECT COUNT(*) FROM public.profiles 
          WHERE default_store_id = v_alternative_store_id
            AND is_active = true
        ),
        'alternative_store_id', v_alternative_store_id,
        'strategy', 'auto_migrate'
      );
    ELSE
      -- Não há loja alternativa, desativar usuários
      UPDATE public.profiles
      SET is_active = false
      WHERE default_store_id = p_store_id
        AND is_active = true
        AND deleted_at IS NULL;
      
      UPDATE public.store_members
      SET active = false
      WHERE store_id = p_store_id
        AND active = true;
      
      v_migration_details := jsonb_build_object(
        'users_deactivated', v_affected_count,
        'reason', 'no_alternative_store',
        'strategy', 'auto_migrate'
      );
    END IF;
  ELSIF p_migration_strategy = 'deactivate_users' THEN
    UPDATE public.profiles
    SET is_active = false
    WHERE default_store_id = p_store_id
      AND is_active = true
      AND deleted_at IS NULL;
    
    UPDATE public.store_members
    SET active = false
    WHERE store_id = p_store_id
      AND active = true;
    
    v_migration_details := jsonb_build_object(
      'users_deactivated', v_affected_count,
      'strategy', 'deactivate_users'
    );
  END IF;
  
  -- Desativar a loja
  UPDATE public.stores
  SET 
    is_active = false,
    deactivated_at = now(),
    deactivated_by = p_performed_by
  WHERE id = p_store_id;
  
  -- Criar registro de auditoria
  INSERT INTO public.deactivation_audit (
    entity_type,
    entity_id,
    entity_name,
    action,
    affected_users_count,
    migration_strategy,
    migration_details,
    performed_by,
    notes
  ) VALUES (
    'store',
    p_store_id,
    v_store_name,
    'deactivated',
    v_affected_count,
    p_migration_strategy,
    v_migration_details,
    p_performed_by,
    p_notes
  ) RETURNING id INTO v_audit_id;
  
  -- Registrar impacto em cada usuário afetado
  INSERT INTO public.user_deactivation_impact (
    user_id,
    deactivation_audit_id,
    entity_type,
    entity_id,
    entity_name,
    previous_network_id,
    previous_store_id,
    action_taken,
    new_store_id
  )
  SELECT DISTINCT
    COALESCE(p.id, sm.user_id),
    v_audit_id,
    'store',
    p_store_id,
    v_store_name,
    COALESCE(p.network_id, p.org_id),
    p.default_store_id,
    CASE 
      WHEN v_alternative_store_id IS NOT NULL AND p_migration_strategy = 'auto_migrate' THEN 'migrated'
      WHEN p_migration_strategy = 'deactivate_users' THEN 'deactivated'
      ELSE 'manual_review'
    END,
    v_alternative_store_id
  FROM public.profiles p
  FULL OUTER JOIN public.store_members sm ON sm.user_id = p.id AND sm.store_id = p_store_id
  WHERE (p.default_store_id = p_store_id OR sm.store_id = p_store_id)
    AND (p.is_active = false OR sm.active = false OR p.default_store_id = v_alternative_store_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'store_id', p_store_id,
    'store_name', v_store_name,
    'affected_users', v_affected_count,
    'migration_strategy', p_migration_strategy,
    'alternative_store_id', v_alternative_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para reativar uma rede
CREATE OR REPLACE FUNCTION public.reactivate_network(
  p_network_id UUID,
  p_performed_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_network_name TEXT;
  v_audit_id UUID;
BEGIN
  SELECT name INTO v_network_name
  FROM public.networks
  WHERE id = p_network_id;
  
  IF v_network_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rede não encontrada'
    );
  END IF;
  
  -- Reativar a rede
  UPDATE public.networks
  SET 
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL,
    updated_at = now()
  WHERE id = p_network_id;
  
  -- Criar registro de auditoria
  INSERT INTO public.deactivation_audit (
    entity_type,
    entity_id,
    entity_name,
    action,
    performed_by,
    notes
  ) VALUES (
    'network',
    p_network_id,
    v_network_name,
    'reactivated',
    p_performed_by,
    p_notes
  ) RETURNING id INTO v_audit_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'network_id', p_network_id,
    'network_name', v_network_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para reativar uma loja
CREATE OR REPLACE FUNCTION public.reactivate_store(
  p_store_id UUID,
  p_performed_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_store_name TEXT;
  v_audit_id UUID;
BEGIN
  SELECT name INTO v_store_name
  FROM public.stores
  WHERE id = p_store_id;
  
  IF v_store_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Loja não encontrada'
    );
  END IF;
  
  -- Reativar a loja
  UPDATE public.stores
  SET 
    is_active = true,
    deactivated_at = NULL,
    deactivated_by = NULL
  WHERE id = p_store_id;
  
  -- Criar registro de auditoria
  INSERT INTO public.deactivation_audit (
    entity_type,
    entity_id,
    entity_name,
    action,
    performed_by,
    notes
  ) VALUES (
    'store',
    p_store_id,
    v_store_name,
    'reactivated',
    p_performed_by,
    p_notes
  ) RETURNING id INTO v_audit_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'store_id', p_store_id,
    'store_name', v_store_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

