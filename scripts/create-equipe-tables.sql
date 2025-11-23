-- =====================================================
-- Script de Criação de Tabelas - Módulo de Equipe
-- Sistema TEM VENDA
-- =====================================================

-- Tabela de Colaboradores (Employees)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dados Pessoais
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  birth_date DATE,
  email TEXT,
  phone TEXT,
  
  -- Dados Profissionais
  position TEXT NOT NULL, -- Cargo: farmaceutico, balconista, caixa, gerente, etc.
  department TEXT,
  hire_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, on_leave, terminated
  contract_type TEXT DEFAULT 'CLT', -- CLT, PJ, intern, temporary
  salary_base NUMERIC(10, 2),
  commission_rate NUMERIC(5, 2) DEFAULT 0,
  
  -- Endereço (JSONB para flexibilidade)
  address JSONB,
  
  -- Dados Bancários (JSONB)
  bank_account JSONB,
  
  -- Foto
  photo_url TEXT,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'on_leave', 'terminated')),
  CONSTRAINT valid_contract_type CHECK (contract_type IN ('CLT', 'PJ', 'intern', 'temporary'))
);

-- Índices para employees
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON employees(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;

-- Tabela de Escalas (Shifts)
CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL, -- morning, afternoon, night, full
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 60, -- minutos de intervalo
  
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, completed, absent, cancelled
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_shift_type CHECK (shift_type IN ('morning', 'afternoon', 'night', 'full')),
  CONSTRAINT valid_shift_status CHECK (status IN ('scheduled', 'confirmed', 'completed', 'absent', 'cancelled')),
  CONSTRAINT unique_employee_shift_date UNIQUE (employee_id, shift_date)
);

-- Índices para employee_shifts
CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON employee_shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON employee_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_date_range ON employee_shifts(shift_date, store_id);

-- Tabela de Registro de Ponto (Time Records)
CREATE TABLE IF NOT EXISTS time_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  record_date DATE NOT NULL,
  
  -- Horários de ponto
  entry_time TIMESTAMP WITH TIME ZONE,
  exit_break_time TIMESTAMP WITH TIME ZONE, -- Saída para intervalo
  return_break_time TIMESTAMP WITH TIME ZONE, -- Retorno do intervalo
  exit_time TIMESTAMP WITH TIME ZONE,
  
  -- Cálculos
  total_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  break_duration INTEGER DEFAULT 0, -- minutos
  
  -- Status e justificativas
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, justified, holiday
  justification TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_time_record_status CHECK (status IN ('present', 'absent', 'late', 'justified', 'holiday')),
  CONSTRAINT unique_employee_date UNIQUE (employee_id, record_date)
);

-- Índices para time_records
CREATE INDEX IF NOT EXISTS idx_time_records_employee_id ON time_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_store_id ON time_records(store_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(record_date);
CREATE INDEX IF NOT EXISTS idx_time_records_date_range ON time_records(record_date, store_id);

-- Tabela de Solicitações de Horas Extras
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  request_date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL,
  
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_overtime_status CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT positive_hours CHECK (hours > 0)
);

-- Índices para overtime_requests
CREATE INDEX IF NOT EXISTS idx_overtime_employee_id ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_store_id ON overtime_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_overtime_date ON overtime_requests(request_date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON employee_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_records_updated_at
  BEFORE UPDATE ON time_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_overtime_requests_updated_at
  BEFORE UPDATE ON overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para employees
-- Admins podem ver todos os colaboradores
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Usuários podem ver colaboradores da sua loja
CREATE POLICY "Users can view employees from their stores"
  ON employees FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Admins podem inserir/atualizar/deletar
CREATE POLICY "Admins can manage employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Gerentes podem inserir/atualizar colaboradores da sua loja
CREATE POLICY "Managers can manage employees from their stores"
  ON employees FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

-- Políticas para employee_shifts (mesma lógica)
CREATE POLICY "Users can view shifts from their stores"
  ON employee_shifts FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

CREATE POLICY "Managers can manage shifts from their stores"
  ON employee_shifts FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

-- Políticas para time_records
CREATE POLICY "Users can view time records from their stores"
  ON time_records FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

-- Colaboradores podem ver seus próprios registros
CREATE POLICY "Employees can view their own time records"
  ON time_records FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage time records from their stores"
  ON time_records FOR ALL
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND active = true
    )
  );

-- Políticas para overtime_requests
CREATE POLICY "Users can view overtime requests from their stores"
  ON overtime_requests FOR SELECT
  USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()
      AND active = true
    )
  );

CREATE POLICY "Employees can create their own overtime requests"
  ON overtime_requests FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can approve overtime requests"
  ON overtime_requests FOR UPDATE
  USING (
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

COMMENT ON TABLE employees IS 'Tabela de colaboradores/funcionários das lojas';
COMMENT ON TABLE employee_shifts IS 'Tabela de escalas de trabalho dos colaboradores';
COMMENT ON TABLE time_records IS 'Tabela de registros de ponto dos colaboradores';
COMMENT ON TABLE overtime_requests IS 'Tabela de solicitações de horas extras';

