CREATE TABLE IF NOT EXISTS public.user_changes_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deactivated', 'reactivated', 'deleted', 'restored')),
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_changes_history_user_id ON public.user_changes_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_changes_history_changed_by ON public.user_changes_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_changes_history_created_at ON public.user_changes_history(created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_change_type TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
    v_description := 'Usuário criado';
    
    INSERT INTO public.user_changes_history (
      user_id,
      changed_by,
      change_type,
      description
    ) VALUES (
      NEW.id,
      COALESCE(NEW.invited_by, (SELECT id FROM auth.users WHERE id = NEW.id LIMIT 1)),
      v_change_type,
      v_description
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_change_type := 'deleted';
      v_description := 'Usuário excluído';
      
      INSERT INTO public.user_changes_history (
        user_id,
        changed_by,
        change_type,
        description
      ) VALUES (
        NEW.id,
        COALESCE(NEW.deleted_by, (SELECT auth.uid())),
        v_change_type,
        v_description
      );
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      v_change_type := 'restored';
      v_description := 'Usuário restaurado';
      
      INSERT INTO public.user_changes_history (
        user_id,
        changed_by,
        change_type,
        description
      ) VALUES (
        NEW.id,
        COALESCE((SELECT auth.uid()), NEW.id),
        v_change_type,
        v_description
      );
    ELSIF NEW.is_active = false AND OLD.is_active = true THEN
      v_change_type := 'deactivated';
      v_description := 'Usuário desativado';
      
      INSERT INTO public.user_changes_history (
        user_id,
        changed_by,
        change_type,
        description
      ) VALUES (
        NEW.id,
        COALESCE((SELECT auth.uid()), NEW.id),
        v_change_type,
        v_description
      );
    ELSIF NEW.is_active = true AND OLD.is_active = false THEN
      v_change_type := 'reactivated';
      v_description := 'Usuário reativado';
      
      INSERT INTO public.user_changes_history (
        user_id,
        changed_by,
        change_type,
        description
      ) VALUES (
        NEW.id,
        COALESCE((SELECT auth.uid()), NEW.id),
        v_change_type,
        v_description
      );
    ELSE
      v_change_type := 'updated';
      
      IF NEW.role != OLD.role THEN
        INSERT INTO public.user_changes_history (
          user_id,
          changed_by,
          change_type,
          field_name,
          old_value,
          new_value,
          description
        ) VALUES (
          NEW.id,
          COALESCE((SELECT auth.uid()), NEW.id),
          v_change_type,
          'role',
          OLD.role,
          NEW.role,
          'Cargo alterado de ' || OLD.role || ' para ' || NEW.role
        );
      END IF;
      
      IF NEW.full_name != OLD.full_name THEN
        INSERT INTO public.user_changes_history (
          user_id,
          changed_by,
          change_type,
          field_name,
          old_value,
          new_value,
          description
        ) VALUES (
          NEW.id,
          COALESCE((SELECT auth.uid()), NEW.id),
          v_change_type,
          'full_name',
          OLD.full_name,
          NEW.full_name,
          'Nome alterado de "' || COALESCE(OLD.full_name, 'N/A') || '" para "' || COALESCE(NEW.full_name, 'N/A') || '"'
        );
      END IF;
      
      IF NEW.network_id != OLD.network_id OR (NEW.network_id IS NULL) != (OLD.network_id IS NULL) THEN
        INSERT INTO public.user_changes_history (
          user_id,
          changed_by,
          change_type,
          field_name,
          old_value,
          new_value,
          description
        ) VALUES (
          NEW.id,
          COALESCE((SELECT auth.uid()), NEW.id),
          v_change_type,
          'network_id',
          OLD.network_id::TEXT,
          NEW.network_id::TEXT,
          'Rede alterada'
        );
      END IF;
      
      IF NEW.default_store_id != OLD.default_store_id OR (NEW.default_store_id IS NULL) != (OLD.default_store_id IS NULL) THEN
        INSERT INTO public.user_changes_history (
          user_id,
          changed_by,
          change_type,
          field_name,
          old_value,
          new_value,
          description
        ) VALUES (
          NEW.id,
          COALESCE((SELECT auth.uid()), NEW.id),
          v_change_type,
          'default_store_id',
          OLD.default_store_id::TEXT,
          NEW.default_store_id::TEXT,
          'Loja padrão alterada'
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_user_changes ON public.profiles;
CREATE TRIGGER trigger_log_user_changes
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

