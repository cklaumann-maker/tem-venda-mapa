-- Migração para estrutura Empresas → Lojas
-- Garantir que org_id não seja null nas stores existentes
-- Criar uma empresa padrão se necessário

-- 1. Criar empresa padrão para stores sem org_id
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Verificar se existe alguma org
  SELECT id INTO default_org_id FROM orgs LIMIT 1;
  
  -- Se não existir, criar uma
  IF default_org_id IS NULL THEN
    INSERT INTO orgs (name) VALUES ('Empresa Padrão') RETURNING id INTO default_org_id;
  END IF;
  
  -- Atualizar stores sem org_id
  UPDATE stores 
  SET org_id = default_org_id 
  WHERE org_id IS NULL;
END $$;

-- 2. Tornar org_id obrigatório (não nullable)
ALTER TABLE stores 
  ALTER COLUMN org_id SET NOT NULL;

-- 3. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_stores_org_id ON stores(org_id);

-- 4. Comentários para documentação
COMMENT ON TABLE orgs IS 'Empresas/Organizações que possuem uma ou mais lojas';
COMMENT ON TABLE stores IS 'Lojas que pertencem a uma empresa (org)';
COMMENT ON COLUMN stores.org_id IS 'ID da empresa/organização à qual a loja pertence';




