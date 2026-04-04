-- Create public.user_org_ids() wrapper that delegates to auth.user_org_ids()
-- This fixes RLS policies in migrations 00016-00027 that reference public.user_org_ids()
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;
