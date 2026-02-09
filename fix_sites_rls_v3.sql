-- Enable RLS just in case
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if any (to avoid conflicts)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sites;

-- Create a policy that allows authenticated users to insert sites
-- We rely on the application to provide the correct company_id
CREATE POLICY "Enable insert for authenticated users"
ON public.sites
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure Select/Update/Delete policies exist (optional, but good practice)
-- Assuming existing policies cover these, but adding basic ones just in case
-- CREATE POLICY "Enable select for users based on company_id" ... (Existing policies likely cover this)
