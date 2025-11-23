-- =====================================================
-- Script de Correção de RLS - Fase 3 do Módulo de Equipe
-- Sistema TEM VENDA
-- =====================================================
-- Este script corrige as políticas RLS que estavam bloqueando INSERTs

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view terminations from their stores" ON terminations;
DROP POLICY IF EXISTS "Managers can manage terminations from their stores" ON terminations;
DROP POLICY IF EXISTS "Users can view reviews from their stores" ON performance_reviews;
DROP POLICY IF EXISTS "Employees can view their own reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Managers can manage reviews from their stores" ON performance_reviews;
DROP POLICY IF EXISTS "Users can view goals from their stores" ON employee_goals;
DROP POLICY IF EXISTS "Employees can view their own goals" ON employee_goals;
DROP POLICY IF EXISTS "Managers can manage goals from their stores" ON employee_goals;

-- =====================================================
-- Políticas Corrigidas para terminations
-- =====================================================

-- Admins podem ver todos os processos de rescisão
CREATE POLICY "Admins can view all terminations"
  ON terminations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver processos de rescisão da sua loja
CREATE POLICY "Users can view terminations from their stores"
  ON terminations FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Admins podem gerenciar todos os processos
CREATE POLICY "Admins can manage all terminations"
  ON terminations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Gerentes podem gerenciar processos de rescisão da sua loja
CREATE POLICY "Managers can manage terminations from their stores"
  ON terminations FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

-- =====================================================
-- Políticas Corrigidas para performance_reviews
-- =====================================================

-- Admins podem ver todas as avaliações
CREATE POLICY "Admins can view all reviews"
  ON performance_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver avaliações da sua loja
CREATE POLICY "Users can view reviews from their stores"
  ON performance_reviews FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem ver suas próprias avaliações
CREATE POLICY "Employees can view their own reviews"
  ON performance_reviews FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Admins podem gerenciar todas as avaliações
CREATE POLICY "Admins can manage all reviews"
  ON performance_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Gerentes podem gerenciar avaliações da sua loja
CREATE POLICY "Managers can manage reviews from their stores"
  ON performance_reviews FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

-- =====================================================
-- Políticas Corrigidas para employee_goals
-- =====================================================

-- Admins podem ver todas as metas
CREATE POLICY "Admins can view all goals"
  ON employee_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver metas da sua loja
CREATE POLICY "Users can view goals from their stores"
  ON employee_goals FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem ver suas próprias metas
CREATE POLICY "Employees can view their own goals"
  ON employee_goals FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Admins podem gerenciar todas as metas
CREATE POLICY "Admins can manage all goals"
  ON employee_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Gerentes podem gerenciar metas da sua loja
CREATE POLICY "Managers can manage goals from their stores"
  ON employee_goals FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

