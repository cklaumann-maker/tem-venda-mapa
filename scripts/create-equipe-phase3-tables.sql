-- =====================================================
-- Script de Criação de Tabelas - Fase 3 do Módulo de Equipe
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

-- Tabela de Processos de Rescisão
CREATE TABLE IF NOT EXISTS terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  termination_date DATE NOT NULL,
  termination_type TEXT NOT NULL, -- without_cause, with_cause, resignation, contract_end
  reason TEXT NOT NULL,
  
  -- Cálculo de verbas rescisórias (JSONB para flexibilidade)
  severance_calculation JSONB DEFAULT '{}'::jsonb,
  
  -- Checklist de rescisão
  checklist JSONB DEFAULT '{}'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  CONSTRAINT valid_termination_type CHECK (termination_type IN (
    'without_cause', 'with_cause', 'resignation', 'contract_end'
  )),
  CONSTRAINT valid_termination_status CHECK (status IN ('in_progress', 'completed', 'cancelled'))
);

-- Índices para terminations
CREATE INDEX IF NOT EXISTS idx_terminations_employee_id ON terminations(employee_id);
CREATE INDEX IF NOT EXISTS idx_terminations_store_id ON terminations(store_id);
CREATE INDEX IF NOT EXISTS idx_terminations_status ON terminations(status);
CREATE INDEX IF NOT EXISTS idx_terminations_date ON terminations(termination_date);

-- Tabela de Avaliações de Performance
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  review_period TEXT NOT NULL, -- Q1, Q2, Q3, Q4, annual, custom
  review_date DATE NOT NULL,
  
  -- Critérios de avaliação (JSONB)
  scores JSONB DEFAULT '{}'::jsonb,
  
  -- Comentários e feedback
  comments TEXT,
  strengths TEXT,
  improvement_areas TEXT,
  
  -- Plano de desenvolvimento
  development_plan JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  reviewer_id UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_review_period CHECK (review_period IN (
    'Q1', 'Q2', 'Q3', 'Q4', 'annual', 'custom'
  ))
);

-- Índices para performance_reviews
CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON performance_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_period ON performance_reviews(review_period);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON performance_reviews(review_date);

-- Tabela de Metas Individuais
CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  goal_period TEXT NOT NULL, -- monthly, quarterly, annual
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metas
  sales_target NUMERIC(12, 2),
  sales_achieved NUMERIC(12, 2) DEFAULT 0,
  
  -- Metas adicionais (JSONB)
  additional_goals JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_goal_period CHECK (goal_period IN ('monthly', 'quarterly', 'annual')),
  CONSTRAINT valid_goal_status CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT valid_goal_date_range CHECK (period_end >= period_start)
);

-- Índices para employee_goals
CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_store_id ON employee_goals(store_id);
CREATE INDEX IF NOT EXISTS idx_goals_period ON employee_goals(goal_period);
CREATE INDEX IF NOT EXISTS idx_goals_date_range ON employee_goals(period_start, period_end);

-- Triggers para updated_at
CREATE TRIGGER update_terminations_updated_at
  BEFORE UPDATE ON terminations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON employee_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para terminations
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

-- Políticas para performance_reviews
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

-- Políticas para employee_goals
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

-- =====================================================
-- Comentários nas Tabelas
-- =====================================================

COMMENT ON TABLE terminations IS 'Tabela de processos de rescisão de colaboradores';
COMMENT ON TABLE performance_reviews IS 'Tabela de avaliações de desempenho dos colaboradores';
COMMENT ON TABLE employee_goals IS 'Tabela de metas individuais dos colaboradores';

