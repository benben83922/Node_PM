-- archive_project(p_project_id) — admin only
-- Sets projects.status = 'archived'. Safe to call multiple times.
CREATE OR REPLACE FUNCTION public.archive_project(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_access AS chk
    WHERE chk.user_id = auth.uid()
      AND chk.project_id = p_project_id
      AND chk.role = 'admin'
  ) THEN
    RETURN 'error: admin only';
  END IF;

  UPDATE public.projects
  SET status = 'archived'
  WHERE id = p_project_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_project(UUID) TO authenticated;
