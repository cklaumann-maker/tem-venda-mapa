DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_user_name TEXT;
  v_performed_by UUID;
BEGIN
  SELECT id INTO v_performed_by FROM auth.users WHERE email = 'davi@temvenda.com.br' LIMIT 1;

  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users 
  WHERE email = 'volito8544@arugy.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT role, full_name INTO v_user_role, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    INSERT INTO public.user_changes_history (user_id, changed_by, change_type, description)
    VALUES (
      v_user_id, 
      COALESCE(v_performed_by, v_user_id), 
      'deleted',
      'Usuário excluído definitivamente do sistema (hard delete)'
    );

    DELETE FROM auth.users WHERE id = v_user_id;

    RAISE NOTICE 'Usuário % excluído definitivamente (ID: %)', v_user_email, v_user_id;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado', 'volito8544@arugy.com';
  END IF;
END $$;

SELECT 
  u.id,
  u.email,
  u.created_at,
  u.deleted_at
FROM auth.users u
WHERE u.email = 'volito8544@arugy.com';
