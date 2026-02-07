-- Allow users to insert their own profile (Fixes "Profile creation failed" error)
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- Also allow them to update their own profile (just in case)
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (
  auth.uid() = id
);

-- Re-run the force admin update just to be sure
UPDATE public.users SET role = 'admin';
