-- =====================================================
-- Script para Adicionar Política de UPDATE para Usuários Normais
-- Tabela: form_schedule_tasks
-- Sistema TEM VENDA
-- =====================================================

-- Permitir que usuários normais atualizem tarefas agendadas da sua loja
-- Isso é necessário para o widget da página inicial poder marcar tarefas como "respondido"
CREATE POLICY "Users can update schedule tasks from their stores"
  ON form_schedule_tasks FOR UPDATE
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- =====================================================
-- Comentário
-- =====================================================

COMMENT ON POLICY "Users can update schedule tasks from their stores" ON form_schedule_tasks IS 
'Permite que usuários normais (não apenas managers) atualizem o status de tarefas agendadas da sua loja. Necessário para o widget da página inicial funcionar corretamente.';

