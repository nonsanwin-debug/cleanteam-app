-- FIX: "No workers found" issue (RLS Recursion on users table)
-- The previous policy tried to read 'users' to check if admin, while trying to read 'users'.
-- We must use the is_admin() function (SECURITY DEFINER) to break this loop.

-- 1. Verify is_admin function exists (re-create just in case)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Critical: Runs with owner permissions, bypassing RLS
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. Fix 'users' table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data (Always safe)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow Admins to read ALL data using the Safe Function
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
CREATE POLICY "Admins can read all user data"
ON public.users FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- 3. Also allow Admins to Update/Delete users if needed (User Management)
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users"
ON public.users FOR UPDATE
TO authenticated
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- 4. Re-grant permissions just in case
GRANT SELECT ON public.users TO authenticated;
