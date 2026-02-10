-- Allow anonymous users to view site details if they have the ID
-- This is necessary for the customer "Share Link" to work.
DROP POLICY IF EXISTS "Allow Anon Select Sites" ON public.sites;

CREATE POLICY "Allow Anon Select Sites"
ON public.sites FOR SELECT
TO anon
USING (true);

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
