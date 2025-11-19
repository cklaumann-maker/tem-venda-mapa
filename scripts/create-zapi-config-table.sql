-- Script para criar tabela de configurações Z-API no Supabase
-- Execute este script no SQL Editor do Supabase

-- Criar tabela de configurações Z-API
CREATE TABLE IF NOT EXISTS zapi_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  client_token_encrypted TEXT, -- Token do cliente será criptografado
  manager_phone TEXT DEFAULT '5551982813505',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(instance_id, token) -- Garante que não haja duplicatas
);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_zapi_config_updated_at
  BEFORE UPDATE ON zapi_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE zapi_config ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver
CREATE POLICY "Apenas admins podem visualizar configurações Z-API"
  ON zapi_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Apenas admins podem inserir
CREATE POLICY "Apenas admins podem inserir configurações Z-API"
  ON zapi_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Apenas admins podem atualizar
CREATE POLICY "Apenas admins podem atualizar configurações Z-API"
  ON zapi_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Apenas admins podem deletar
CREATE POLICY "Apenas admins podem deletar configurações Z-API"
  ON zapi_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE zapi_config IS 'Configurações da integração Z-API armazenadas de forma segura';
COMMENT ON COLUMN zapi_config.instance_id IS 'ID da instância Z-API';
COMMENT ON COLUMN zapi_config.token IS 'Token da instância Z-API';
COMMENT ON COLUMN zapi_config.client_token_encrypted IS 'Client-token criptografado';
COMMENT ON COLUMN zapi_config.manager_phone IS 'Número do WhatsApp do gerente para notificações';

