-- 1. Create a safe, non-recursive function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Drop the original recursive policies that caused the "Empty Content" bug
DROP POLICY IF EXISTS "Master can full access users" ON public.users;
DROP POLICY IF EXISTS "Master can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Master can full access sites" ON public.sites;

-- 3. Re-create the Master policies using the safe function
CREATE POLICY "Master can full access users" ON public.users 
FOR ALL USING (
  public.get_auth_user_role() = 'master'
);

CREATE POLICY "Master can view all companies" ON public.companies 
FOR SELECT USING (
  public.get_auth_user_role() = 'master'
);

CREATE POLICY "Master can full access sites" ON public.sites 
FOR ALL USING (
  public.get_auth_user_role() = 'master'
);
