-- Script para corrigir a função log_user_changes que está tentando usar
-- colunas old_values/new_values (plural, jsonb) quando a tabela tem old_value/new_value (singular, text)
-- Execute este script no Supabase SQL Editor

-- Primeiro, desabilitar o trigger temporariamente
ALTER TABLE profiles DISABLE TRIGGER trigger_log_user_changes;

-- Corrigir a função para usar os nomes corretos das colunas
-- PROBLEMA IDENTIFICADO:
-- - Função atual usa: old_values, new_values (plural, jsonb)
-- - Tabela tem: old_value, new_value (singular, text)
-- - Função sempre usa 'update' mas deveria detectar INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_changes_history (
    user_id,
    changed_by,
    change_type,
    field_name,
    old_value,
    new_value,
    created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    -- Usar auth.uid() se disponível, caso contrário usar o próprio ID do perfil
    -- Isso funciona para operações via admin onde auth.uid() pode ser NULL
    COALESCE(auth.uid(), COALESCE(NEW.id, OLD.id)),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
      ELSE 'unknown'
    END,
    NULL, -- field_name - pode ser NULL para mudanças completas
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD)::text ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::text ELSE NULL END,
    NOW()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Reabilitar o trigger
ALTER TABLE profiles ENABLE TRIGGER trigger_log_user_changes;

