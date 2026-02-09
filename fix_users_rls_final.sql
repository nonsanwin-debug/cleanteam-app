-- Fix users table RLS policies to ensure users can read their own profile
-- This is critical for the app to work

-- 1. Enable RLS (just in case)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view company colleagues" ON public.users;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own user" ON public.users;

-- 3. Create simple "Read Own" policy (Most Important)
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (
    auth.uid() = id
);

-- 4. Create "Read Colleagues" policy (Optional but good for multi-user companies)
-- Allow reading users who belong to the same company
CREATE POLICY "Users can view company colleagues" 
ON public.users 
FOR SELECT 
USING (
    company_id IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- 5. Create "Update Own" policy (for editing profile)
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE
USING (auth.uid() = id);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'users';
