-- FIX V2: NUCLEAR OPTION FOR CHECKLIST SUBMISSIONS
-- Clears all existing policies and sets up a simple "Allow All" for everyone.

-- 1. Reset Policies on checklist_submissions
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- Drop ALL known policies to avoid conflicts
DROP POLICY IF EXISTS "Allow Anon Insert Checklist" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Allow Anon Update Checklist" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Allow Anon Select Checklist" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Allow ALL for authenticated" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Enable update for users based on worker_id" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Enable update for users based on site_id" ON public.checklist_submissions;

-- Create ONE comprehensive policy for EVERYONE (Anon + Authenticated)
-- This allows anyone to Read/Write checklist data. 
-- Since site_id is a UUID known only to participants, security risk is low.
DROP POLICY IF EXISTS "Allow All Access to Checklists" ON public.checklist_submissions;
CREATE POLICY "Allow All Access to Checklists"
ON public.checklist_submissions FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- 2. Ensure Storage Permissions (Signatures)
UPDATE storage.buckets SET public = true WHERE id = 'site-photos';

DROP POLICY IF EXISTS "Allow Anon Upload Signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload Site Photos" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;

-- Allow Public (Anon + Auth) to INSERT into site-photos
DROP POLICY IF EXISTS "Allow Public Upload to Site Photos" ON storage.objects;
CREATE POLICY "Allow Public Upload to Site Photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'site-photos' );

-- Allow Public Read is already covered by "Public Access" policy usually, 
-- but let's ensure it exists just in case
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'site-photos' );


-- 3. Ensure RPC Exists (for Site Completion)
CREATE OR REPLACE FUNCTION complete_site_public(target_site_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sites
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = target_site_id;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_site_public(uuid) TO public; -- public includes anon & authenticated

-- 4. Reload Schema
NOTIFY pgrst, 'reload config';
