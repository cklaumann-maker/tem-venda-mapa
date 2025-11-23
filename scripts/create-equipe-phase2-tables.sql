-- =====================================================
-- Script de Criação de Tabelas - Fase 2 do Módulo de Equipe
-- Sistema TEM VENDA
-- =====================================================

-- Tabela de Processos de Admissão
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  
  -- Checklist (JSONB para flexibilidade)
  checklist JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  CONSTRAINT valid_admission_status CHECK (status IN ('in_progress', 'completed', 'cancelled'))
);

-- Índices para admissions
CREATE INDEX IF NOT EXISTS idx_admissions_employee_id ON admissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_admissions_store_id ON admissions(store_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);

-- Tabela de Documentos dos Colaboradores
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- admission, license, certificate, medical, etc.
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER, -- em bytes
  
  expiry_date DATE,
  is_valid BOOLEAN DEFAULT true,
  
  -- Metadados
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  CONSTRAINT valid_document_type CHECK (document_type IN (
    'admission', 'license', 'certificate', 'medical', 'training', 
    'contract', 'termination', 'other'
  ))
);

-- Índices para employee_documents
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_store_id ON employee_documents(store_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Tabela de Férias
CREATE TABLE IF NOT EXISTS vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'requested', -- requested, approved, rejected, taken, cancelled
  
  -- Aprovação
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Metadados
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT valid_vacation_status CHECK (status IN ('requested', 'approved', 'rejected', 'taken', 'cancelled')),
  CONSTRAINT positive_days CHECK (days > 0),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Índices para vacations
CREATE INDEX IF NOT EXISTS idx_vacations_employee_id ON vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_store_id ON vacations(store_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON vacations(status);
CREATE INDEX IF NOT EXISTS idx_vacations_date_range ON vacations(start_date, end_date);

-- Tabela de Licenças e Afastamentos
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  leave_type TEXT NOT NULL, -- medical, maternity, paternity, unpaid, justified_absence, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  
  -- Documentos
  document_url TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, active, completed, rejected
  
  -- Aprovação
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  CONSTRAINT valid_leave_type CHECK (leave_type IN (
    'medical', 'maternity', 'paternity', 'unpaid', 'justified_absence', 
    'holiday', 'other'
  )),
  CONSTRAINT valid_leave_status CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  CONSTRAINT valid_leave_date_range CHECK (end_date >= start_date)
);

-- Índices para leaves
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_store_id ON leaves(store_id);
CREATE INDEX IF NOT EXISTS idx_leaves_type ON leaves(leave_type);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves(start_date, end_date);

-- Triggers para updated_at
CREATE TRIGGER update_admissions_updated_at
  BEFORE UPDATE ON admissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Políticas para admissions
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

-- Políticas para employee_documents
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

-- Políticas para vacations
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

-- Políticas para leaves
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

-- =====================================================
-- Comentários nas Tabelas
-- =====================================================

COMMENT ON TABLE admissions IS 'Tabela de processos de admissão de colaboradores';
COMMENT ON TABLE employee_documents IS 'Tabela de documentos dos colaboradores';
COMMENT ON TABLE vacations IS 'Tabela de solicitações e registros de férias';
COMMENT ON TABLE leaves IS 'Tabela de licenças e afastamentos dos colaboradores';

