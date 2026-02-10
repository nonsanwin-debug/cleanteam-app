-- FIX EVERYTHING SIMPLY (No Complex Functions)

-- 1. USERS TABLE (Fix "No Workers Found")
-- Instead of complex admin checks, let's just allow all logged-in users to read the user list.
-- This solves the recursion instantly.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
DROP POLICY IF EXISTS "Allow read all users" ON public.users;

-- Allow EVERYONE (Workers & Admins) to read user list.
-- This ensures 'getWorkers()' always works and Admin checks always succeed.
CREATE POLICY "Allow read all users"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Allow Admins to Update/Delete users
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users"
ON public.users FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 2. SITES TABLE (Fix "Delete not working")
-- Since we can now read the 'users' table freely, the standard check works perfectly.

DROP POLICY IF EXISTS "Admins can do everything" ON public.sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON public.sites;

CREATE POLICY "Admins can do everything"
ON public.sites
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Ensure Workers can still see assigned sites
DROP POLICY IF EXISTS "Workers can select assigned sites" ON public.sites;
CREATE POLICY "Workers can select assigned sites"
ON public.sites FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 3. PHOTOS & CHECKLISTS (Fix "Foreign Key Blocking")
-- Re-apply Cascade just in case.

DO $$
BEGIN
    -- Photos
    ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_site_id_fkey;
    ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_site_id_cascade_fkey;
    
    ALTER TABLE public.photos
    ADD CONSTRAINT photos_site_id_cascade_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

    -- Checklists
    ALTER TABLE public.checklist_submissions DROP CONSTRAINT IF EXISTS checklist_submissions_site_id_fkey;
    ALTER TABLE public.checklist_submissions DROP CONSTRAINT IF EXISTS checklist_submissions_site_id_cascade_fkey;

    ALTER TABLE public.checklist_submissions
    ADD CONSTRAINT checklist_submissions_site_id_cascade_fkey
    FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;
END $$;

-- 4. PHOTOS & CHECKLISTS RLS (Allow Admin Delete)
DROP POLICY IF EXISTS "Admins can do everything on photos" ON public.photos;
CREATE POLICY "Admins can do everything on photos"
ON public.photos TO authenticated
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );

DROP POLICY IF EXISTS "Admins can do everything on checklists" ON public.checklist_submissions;
CREATE POLICY "Admins can do everything on checklists"
ON public.checklist_submissions TO authenticated
USING ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') )
WITH CHECK ( EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') );
