-- =====================================================
-- Script de Criação de Tabelas - Módulo de Formulários
-- Sistema TEM VENDA
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de Formulários
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- admission, evaluation, checklist, survey, etc.
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  allow_multiple_responses BOOLEAN DEFAULT false,
  requires_authentication BOOLEAN DEFAULT true,
  
  -- Configurações de notificação Z-API
  notify_on_response BOOLEAN DEFAULT true,
  notification_recipients JSONB DEFAULT '[]'::jsonb, -- Array de números de telefone
  notification_template TEXT, -- Template personalizado da mensagem
  
  -- Estrutura do formulário (JSONB)
  questions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_category CHECK (category IN (
    'admission', 'evaluation', 'checklist', 'survey', 'other'
  ) OR category IS NULL)
);

-- Índices para forms
CREATE INDEX IF NOT EXISTS idx_forms_store_id ON forms(store_id);
CREATE INDEX IF NOT EXISTS idx_forms_category ON forms(category);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);

-- Tabela de Respostas de Formulários
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- Respostas (JSONB - mapeia question_id -> resposta)
  responses JSONB DEFAULT '{}'::jsonb,
  
  -- Status da notificação
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_error TEXT,
  
  -- Metadados
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Campos adicionais
  notes TEXT
);

-- Índices para form_responses
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_store_id ON form_responses(store_id);
CREATE INDEX IF NOT EXISTS idx_responses_employee_id ON form_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON form_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_responses_notification_sent ON form_responses(notification_sent);

-- Triggers para updated_at
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para forms
-- Admins podem ver todos os formulários
CREATE POLICY "Admins can view all forms"
  ON forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver formulários da sua loja
CREATE POLICY "Users can view forms from their stores"
  ON forms FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Admins podem gerenciar todos os formulários
CREATE POLICY "Admins can manage all forms"
  ON forms FOR ALL
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

-- Gerentes podem gerenciar formulários da sua loja
CREATE POLICY "Managers can manage forms from their stores"
  ON forms FOR ALL
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

-- Políticas para form_responses
-- Admins podem ver todas as respostas
CREATE POLICY "Admins can view all responses"
  ON form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver respostas da sua loja
CREATE POLICY "Users can view responses from their stores"
  ON form_responses FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem ver suas próprias respostas
CREATE POLICY "Employees can view their own responses"
  ON form_responses FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado pode criar respostas
CREATE POLICY "Authenticated users can create responses"
  ON form_responses FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins podem gerenciar todas as respostas
CREATE POLICY "Admins can manage all responses"
  ON form_responses FOR ALL
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

-- Gerentes podem atualizar respostas da sua loja
CREATE POLICY "Managers can update responses from their stores"
  ON form_responses FOR UPDATE
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
-- Comentários nas Tabelas
-- =====================================================

COMMENT ON TABLE forms IS 'Tabela de formulários criados pelos gerentes';
COMMENT ON TABLE form_responses IS 'Tabela de respostas dos formulários';

