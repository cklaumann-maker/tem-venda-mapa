-- =====================================================
-- Script de Correção de RLS - Fase 2 do Módulo de Equipe
-- Sistema TEM VENDA
-- =====================================================
-- Este script corrige as políticas RLS que estavam bloqueando INSERTs

-- Remover políticas antigas de admissions
DROP POLICY IF EXISTS "Users can view admissions from their stores" ON admissions;
DROP POLICY IF EXISTS "Managers can manage admissions from their stores" ON admissions;

-- Remover políticas antigas de employee_documents
DROP POLICY IF EXISTS "Users can view documents from their stores" ON employee_documents;
DROP POLICY IF EXISTS "Employees can view their own documents" ON employee_documents;
DROP POLICY IF EXISTS "Managers can manage documents from their stores" ON employee_documents;

-- Remover políticas antigas de vacations
DROP POLICY IF EXISTS "Users can view vacations from their stores" ON vacations;
DROP POLICY IF EXISTS "Employees can create their own vacation requests" ON vacations;
DROP POLICY IF EXISTS "Managers can approve vacation requests" ON vacations;

-- Remover políticas antigas de leaves
DROP POLICY IF EXISTS "Users can view leaves from their stores" ON leaves;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON leaves;
DROP POLICY IF EXISTS "Managers can approve leave requests" ON leaves;

-- =====================================================
-- Políticas Corrigidas para admissions
-- =====================================================

-- Admins podem ver todos os processos de admissão
CREATE POLICY "Admins can view all admissions"
  ON admissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver processos de admissão da sua loja
CREATE POLICY "Users can view admissions from their stores"
  ON admissions FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Admins podem gerenciar todos os processos
CREATE POLICY "Admins can manage all admissions"
  ON admissions FOR ALL
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

-- Gerentes podem gerenciar processos de admissão da sua loja
CREATE POLICY "Managers can manage admissions from their stores"
  ON admissions FOR ALL
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
-- Políticas Corrigidas para employee_documents
-- =====================================================

-- Admins podem ver todos os documentos
CREATE POLICY "Admins can view all documents"
  ON employee_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver documentos da sua loja
CREATE POLICY "Users can view documents from their stores"
  ON employee_documents FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem ver seus próprios documentos
CREATE POLICY "Employees can view their own documents"
  ON employee_documents FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Admins podem gerenciar todos os documentos
CREATE POLICY "Admins can manage all documents"
  ON employee_documents FOR ALL
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

-- Gerentes podem gerenciar documentos da sua loja
CREATE POLICY "Managers can manage documents from their stores"
  ON employee_documents FOR ALL
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
-- Políticas Corrigidas para vacations
-- =====================================================

-- Admins podem ver todas as férias
CREATE POLICY "Admins can view all vacations"
  ON vacations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver férias da sua loja
CREATE POLICY "Users can view vacations from their stores"
  ON vacations FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem criar suas próprias solicitações de férias
CREATE POLICY "Employees can create their own vacation requests"
  ON vacations FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Admins podem gerenciar todas as férias
CREATE POLICY "Admins can manage all vacations"
  ON vacations FOR ALL
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

-- Gerentes podem aprovar solicitações de férias da sua loja
CREATE POLICY "Managers can approve vacation requests"
  ON vacations FOR UPDATE
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
-- Políticas Corrigidas para leaves
-- =====================================================

-- Admins podem ver todas as licenças
CREATE POLICY "Admins can view all leaves"
  ON leaves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver licenças da sua loja
CREATE POLICY "Users can view leaves from their stores"
  ON leaves FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem criar suas próprias solicitações de licença
CREATE POLICY "Employees can create their own leave requests"
  ON leaves FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Admins podem gerenciar todas as licenças
CREATE POLICY "Admins can manage all leaves"
  ON leaves FOR ALL
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

-- Gerentes podem aprovar solicitações de licença da sua loja
CREATE POLICY "Managers can approve leave requests"
  ON leaves FOR UPDATE
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

