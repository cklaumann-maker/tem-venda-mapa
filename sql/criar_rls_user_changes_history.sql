ALTER TABLE public.user_changes_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all user changes history" ON public.user_changes_history;
CREATE POLICY "Admins can view all user changes history"
  ON public.user_changes_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view network user changes history" ON public.user_changes_history;
CREATE POLICY "Managers can view network user changes history"
  ON public.user_changes_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid()
      AND p1.role IN ('manager', 'owner')
      AND EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = user_changes_history.user_id
        AND (p2.network_id = p1.network_id OR p2.org_id = p1.network_id)
      )
    )
  );

DROP POLICY IF EXISTS "Allow insert for user changes history" ON public.user_changes_history;
CREATE POLICY "Allow insert for user changes history"
  ON public.user_changes_history
  FOR INSERT
  WITH CHECK (true);

