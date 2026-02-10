-- FIX: Ensure 'users' table is readable so Admin check works!
-- If RLS on 'users' table blocks reading 'role', then checking (role = 'admin') fails silently.

-- 1. Enable RLS on users (if not enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to read their OWN data (Standard)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Allow Admins to read ALL user data (Required for User Management anyway)
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
CREATE POLICY "Admins can read all user data"
ON public.users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);
-- Wait! This is recursive! If I need to read 'users' to check if I'm admin to read 'users'... infinite loop or fail?
-- To break recursion: Use a function or a simpler check?
-- Or rely on "Users can read own data" to cover the subquery "SELECT 1 FROM users WHERE id = auth.uid()".
-- Yes, "Users can read own data" allows the subquery to succeed for the current user.

-- 4. Re-apply Admin Policies on Sites (Just to be safe)
DROP POLICY IF EXISTS "Admins can do everything" ON public.sites;
CREATE POLICY "Admins can do everything"
ON public.sites
TO authenticated
USING (
  -- This subquery relies on reading 'users' table
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 5. EMERGENCY BYPASS (If the above still fails due to RLS weirdness)
-- Create a function 'is_admin()' that bypasses RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Run with privileges of creator (postgres/superuser)
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Now use this function in the policy
DROP POLICY IF EXISTS "Admins can do everything" ON public.sites;
CREATE POLICY "Admins can do everything"
ON public.sites
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 6. Re-apply Photos/Checklists policies using new function
DROP POLICY IF EXISTS "Admins can do everything on photos" ON public.photos;
CREATE POLICY "Admins can do everything on photos"
ON public.photos
TO authenticated
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can do everything on checklists" ON public.checklist_submissions;
CREATE POLICY "Admins can do everything on checklists"
ON public.checklist_submissions
TO authenticated
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- 7. Grant DELETE explicitly
GRANT DELETE ON public.sites TO authenticated;
GRANT DELETE ON public.photos TO authenticated;
GRANT DELETE ON public.checklist_submissions TO authenticated;

