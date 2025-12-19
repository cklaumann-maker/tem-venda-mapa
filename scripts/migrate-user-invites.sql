-- Migration: Sistema de Convites e Gestão de Usuários
-- Data: 2025-01-XX

-- 1. Criar tabela de convites de usuários
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'seller', 'finance', 'leader', 'owner')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar índices para otimização
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites (email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites (token);
CREATE INDEX IF NOT EXISTS idx_user_invites_invited_by ON public.user_invites (invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invites_company_id ON public.user_invites (company_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_store_id ON public.user_invites (store_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON public.user_invites (expires_at);

-- 3. Adicionar campos na tabela profiles para controle de primeiro acesso
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_login_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- 4. Criar função para gerar token único
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Gera um token seguro de 64 caracteres
  token := encode(gen_random_bytes(48), 'base64');
  -- Remove caracteres especiais e mantém apenas alfanuméricos
  token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
  -- Garante que o token seja único
  WHILE EXISTS (SELECT 1 FROM public.user_invites WHERE user_invites.token = token) LOOP
    token := encode(gen_random_bytes(48), 'base64');
    token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
  END LOOP;
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para limpar convites expirados (opcional, pode ser executada periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_invites
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_invites_updated_at
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invites_updated_at();

-- 7. RLS Policies para user_invites
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os convites
CREATE POLICY "Admins can view all invites"
  ON public.user_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Managers podem ver convites da sua empresa
CREATE POLICY "Managers can view company invites"
  ON public.user_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'manager' OR p.role = 'owner')
      AND user_invites.company_id = p.org_id
    )
  );

-- Política: Usuários podem ver seus próprios convites (pelo email)
CREATE POLICY "Users can view their own invites"
  ON public.user_invites
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Política: Admins podem criar convites
CREATE POLICY "Admins can create invites"
  ON public.user_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND invited_by = auth.uid()
  );

-- Política: Managers podem criar convites para sua empresa
CREATE POLICY "Managers can create company invites"
  ON public.user_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'manager' OR p.role = 'owner')
      AND user_invites.company_id = p.org_id
      AND user_invites.role != 'admin'
      AND user_invites.role != 'manager'
    )
    AND invited_by = auth.uid()
  );

-- Política: Admins podem atualizar convites
CREATE POLICY "Admins can update invites"
  ON public.user_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Managers podem atualizar convites da sua empresa
CREATE POLICY "Managers can update company invites"
  ON public.user_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'manager' OR p.role = 'owner')
      AND user_invites.company_id = p.org_id
    )
  );

-- Política: Usuários podem marcar seus próprios convites como usados
CREATE POLICY "Users can mark their invites as used"
  ON public.user_invites
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 8. Comentários para documentação
COMMENT ON TABLE public.user_invites IS 'Armazena convites de usuários para acesso ao sistema';
COMMENT ON COLUMN public.user_invites.token IS 'Token único para ativação da conta (válido por 7 dias)';
COMMENT ON COLUMN public.user_invites.expires_at IS 'Data de expiração do convite';
COMMENT ON COLUMN public.user_invites.used_at IS 'Data em que o convite foi utilizado (null se não usado)';
COMMENT ON COLUMN public.profiles.first_login_completed IS 'Indica se o usuário completou o primeiro login';
COMMENT ON COLUMN public.profiles.password_changed_at IS 'Data da última alteração de senha';

