-- =====================================================
-- Script de Correção - Campo updated_at na tabela terminations
-- Sistema TEM VENDA
-- =====================================================

-- Adicionar campo updated_at na tabela terminations
ALTER TABLE terminations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualizar registros existentes
UPDATE terminations 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- O trigger já deve estar criado, mas vamos garantir que está correto
DROP TRIGGER IF EXISTS update_terminations_updated_at ON terminations;

CREATE TRIGGER update_terminations_updated_at
  BEFORE UPDATE ON terminations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

