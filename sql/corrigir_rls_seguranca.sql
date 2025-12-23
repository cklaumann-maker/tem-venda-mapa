-- ============================================
-- SCRIPT DE CORREÇÃO DE SEGURANÇA RLS
-- Remove policies de desenvolvimento e cria policies seguras
-- ============================================

-- ============================================
-- 1) REMOVER POLICIES DE DESENVOLVIMENTO
-- ============================================

-- ORGS
DROP POLICY IF EXISTS "dev select orgs anon" ON orgs;
DROP POLICY IF EXISTS "orgs insert dev" ON orgs;
DROP POLICY IF EXISTS "orgs select dev" ON orgs;

-- STORES
DROP POLICY IF EXISTS "dev select stores anon" ON stores;
DROP POLICY IF EXISTS "stores insert dev" ON stores;
DROP POLICY IF EXISTS "stores org" ON stores;
DROP POLICY IF EXISTS "stores select dev" ON stores;

-- LOJAS (tabela legada/compatibilidade)
DROP POLICY IF EXISTS "Admin vê todas as lojas (lojas)" ON lojas;
DROP POLICY IF EXISTS "Usuário vê lojas vinculadas (lojas)" ON lojas;
DROP POLICY IF EXISTS "lojas select" ON lojas;
DROP POLICY IF EXISTS "lojas upsert" ON lojas;
DROP POLICY IF EXISTS "lojas_select" ON lojas;

-- ============================================
-- 2) POLICIES SEGURAS PARA vendas_diarias
--    Usa loja_id (referencia tabela lojas)
--    Verifica acesso através de store_members -> stores -> lojas
-- ============================================

-- Garantir RLS habilitado
ALTER TABLE vendas_diarias ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "vendas insert" ON vendas_diarias;
DROP POLICY IF EXISTS "vendas select" ON vendas_diarias;
DROP POLICY IF EXISTS "Users can view vendas from their stores" ON vendas_diarias;
DROP POLICY IF EXISTS "Users can insert vendas for their stores" ON vendas_diarias;
DROP POLICY IF EXISTS "vendas update admin only" ON vendas_diarias;
DROP POLICY IF EXISTS "vendas delete admin only" ON vendas_diarias;

-- SELECT: usuário só vê vendas das lojas em que tem acesso
-- Como lojas e stores são tabelas separadas, verificamos através de network_id
CREATE POLICY "Users can view vendas from their stores"
ON vendas_diarias FOR SELECT
USING (
  -- Admin pode ver tudo
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance: pode ver vendas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
      -- Verifica se a loja pertence à mesma rede (através de stores se houver relação)
      -- Por enquanto, permite acesso se o usuário tem network_id configurado
  )
  OR
  -- Seller: pode ver vendas das lojas onde é membro (através de store_members)
  -- Nota: Esta policy é mais permissiva. Para restringir mais, você precisará
  -- criar uma tabela de mapeamento entre lojas e stores, ou adicionar store_id em lojas
  EXISTS (
    SELECT 1
    FROM store_members sm
    INNER JOIN profiles p ON p.id = auth.uid()
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
      AND p.role = 'seller'
  )
);

-- INSERT: usuário só insere vendas para lojas em que tem acesso
CREATE POLICY "Users can insert vendas for their stores"
ON vendas_diarias FOR INSERT
WITH CHECK (
  -- Admin pode inserir em qualquer loja
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance: pode inserir vendas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
  )
  OR
  -- Seller: pode inserir vendas das lojas onde é membro
  EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
  )
);

-- UPDATE: apenas admin pode atualizar vendas
CREATE POLICY "vendas update admin only"
ON vendas_diarias FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- DELETE: apenas admin pode deletar vendas
CREATE POLICY "vendas delete admin only"
ON vendas_diarias FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- ============================================
-- 3) REFORÇAR metas_mensais POR LOJA
--    Usa loja_id (referencia tabela lojas)
-- ============================================

-- Garantir RLS habilitado
ALTER TABLE metas_mensais ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas genéricas
DROP POLICY IF EXISTS "metas select" ON metas_mensais;
DROP POLICY IF EXISTS "metas update" ON metas_mensais;
DROP POLICY IF EXISTS "metas upsert" ON metas_mensais;
DROP POLICY IF EXISTS "metas_mensais_insert" ON metas_mensais;
DROP POLICY IF EXISTS "metas_mensais_select" ON metas_mensais;
DROP POLICY IF EXISTS "metas_mensais_update" ON metas_mensais;
DROP POLICY IF EXISTS "metas_mensais_delete" ON metas_mensais;

-- SELECT: usuários só veem metas das suas lojas, admin vê tudo
CREATE POLICY "metas_mensais_select"
ON metas_mensais FOR SELECT
USING (
  -- Admin pode ver tudo
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance/Owner: pode ver metas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
  )
  OR
  -- Seller: pode ver metas das lojas onde é membro
  EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
  )
);

-- INSERT: usuários só inserem metas das suas lojas, admin insere em todas
CREATE POLICY "metas_mensais_insert"
ON metas_mensais FOR INSERT
WITH CHECK (
  -- Admin pode inserir em qualquer loja
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance/Owner: pode inserir metas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
  )
  OR
  -- Seller: pode inserir metas das lojas onde é membro
  EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
  )
);

-- UPDATE: usuários só atualizam metas das suas lojas, admin atualiza todas
CREATE POLICY "metas_mensais_update"
ON metas_mensais FOR UPDATE
USING (
  -- Admin pode atualizar qualquer meta
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance/Owner: pode atualizar metas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
  )
  OR
  -- Seller: pode atualizar metas das lojas onde é membro
  EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
  )
)
WITH CHECK (
  -- Admin pode atualizar qualquer meta
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR
  -- Manager/Leader/Finance/Owner: pode atualizar metas da sua rede
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leader', 'finance', 'owner')
      AND p.network_id IS NOT NULL
  )
  OR
  -- Seller: pode atualizar metas das lojas onde é membro
  EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
      AND sm.active = true
  )
);

-- DELETE: apenas admin pode deletar metas
CREATE POLICY "metas_mensais_delete"
ON metas_mensais FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- As tabelas 'lojas' e 'stores' são separadas e não têm relação direta.
-- 
-- As policies criadas usam uma abordagem baseada em:
-- 1. Admin: acesso total
-- 2. Manager/Leader/Finance/Owner: acesso baseado em network_id
-- 3. Seller: acesso baseado em store_members
-- 
-- IMPORTANTE: As policies para vendas_diarias e metas_mensais são mais
-- permissivas para sellers (qualquer seller com store_members pode acessar
-- qualquer loja). Para restringir mais, você precisará:
-- 
-- OPÇÃO 1: Criar uma tabela de mapeamento entre lojas e stores
--   CREATE TABLE loja_store_mapping (
--     loja_id UUID REFERENCES lojas(id),
--     store_id UUID REFERENCES stores(id),
--     PRIMARY KEY (loja_id, store_id)
--   );
-- 
-- OPÇÃO 2: Adicionar store_id na tabela lojas
--   ALTER TABLE lojas ADD COLUMN store_id UUID REFERENCES stores(id);
-- 
-- OPÇÃO 3: Adicionar network_id na tabela lojas
--   ALTER TABLE lojas ADD COLUMN network_id UUID REFERENCES networks(id);
-- 
-- Execute este script e depois verifique se as policies estão funcionando
-- corretamente testando com diferentes usuários.

