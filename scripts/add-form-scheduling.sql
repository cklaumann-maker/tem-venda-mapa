-- =====================================================
-- Script para Adicionar Agendamento de Frequência aos Formulários
-- Sistema TEM VENDA
-- =====================================================

-- Adicionar campos de frequência na tabela forms
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_frequency TEXT, -- 'daily', 'weekly', 'custom_days', 'custom_interval'
ADD COLUMN IF NOT EXISTS schedule_time TIME, -- Horário (ex: 08:30:00)
ADD COLUMN IF NOT EXISTS schedule_days_of_week INTEGER[], -- Para frequência semanal (0=domingo, 1=segunda, etc.)
ADD COLUMN IF NOT EXISTS schedule_interval_days INTEGER, -- Para frequência "de X em X dias"
ADD COLUMN IF NOT EXISTS schedule_start_date DATE, -- Data de início do agendamento
ADD COLUMN IF NOT EXISTS schedule_end_date DATE; -- Data de fim (opcional, NULL = sem fim)

-- Adicionar constraint para validar frequência (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_schedule_frequency' 
    AND conrelid = 'forms'::regclass
  ) THEN
    ALTER TABLE forms 
    ADD CONSTRAINT valid_schedule_frequency 
    CHECK (schedule_frequency IS NULL OR schedule_frequency IN ('daily', 'weekly', 'custom_days', 'custom_interval'));
  END IF;
END $$;

-- Tabela de Tarefas/Agendamentos de Formulários
CREATE TABLE IF NOT EXISTS form_schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Data e hora agendada
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'missed', 'cancelled'
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resposta associada (se houver)
  response_id UUID REFERENCES form_responses(id) ON DELETE SET NULL,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_task_status CHECK (status IN ('pending', 'completed', 'missed', 'cancelled'))
);

-- Índices para form_schedule_tasks
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_form_id ON form_schedule_tasks(form_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_store_id ON form_schedule_tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_scheduled_date ON form_schedule_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_status ON form_schedule_tasks(status);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_scheduled_datetime ON form_schedule_tasks(scheduled_datetime);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_schedule_tasks_updated_at
  BEFORE UPDATE ON form_schedule_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

ALTER TABLE form_schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todas as tarefas
CREATE POLICY "Admins can view all schedule tasks"
  ON form_schedule_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver tarefas da sua loja
CREATE POLICY "Users can view schedule tasks from their stores"
  ON form_schedule_tasks FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Admins podem gerenciar todas as tarefas
CREATE POLICY "Admins can manage all schedule tasks"
  ON form_schedule_tasks FOR ALL
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

-- Gerentes podem gerenciar tarefas da sua loja
CREATE POLICY "Managers can manage schedule tasks from their stores"
  ON form_schedule_tasks FOR ALL
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

-- Comentários
COMMENT ON TABLE form_schedule_tasks IS 'Tabela de tarefas agendadas para resposta de formulários';
COMMENT ON COLUMN form_schedule_tasks.scheduled_datetime IS 'Data e hora combinadas para facilitar queries e ordenação';

