-- 1. Checklist Submissions Policies (Anon Access)
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- Allow Anon to INSERT (Submit checklist)
CREATE POLICY "Allow Anon Insert Checklist"
ON public.checklist_submissions FOR INSERT
TO anon
WITH CHECK (true);

-- Allow Anon to UPDATE (Re-submit or update notes)
CREATE POLICY "Allow Anon Update Checklist"
ON public.checklist_submissions FOR UPDATE
TO anon
USING (true);

-- Allow Anon to SELECT (View own submission) - Already exists but ensuring it
CREATE POLICY "Allow Anon Select Checklist"
ON public.checklist_submissions FOR SELECT
TO anon
USING (true);


-- 2. Storage Policies (Signatures)
-- Ensure 'site-photos' bucket is public (Redundant but safe)
UPDATE storage.buckets SET public = true WHERE id = 'site-photos';

-- Allow Anon to Upload (INSERT) to 'site-photos' bucket
-- This is needed for the signature image upload
DROP POLICY IF EXISTS "Allow Anon Upload Signatures" ON storage.objects;

CREATE POLICY "Allow Anon Upload Signatures"
ON storage.objects FOR INSERT
TO anon
WITH CHECK ( bucket_id = 'site-photos' );


-- 3. Site Completion RPC (Security Definer)
-- Allows anon users to update site status to 'completed' via this function
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

-- Grant permissions for RPC
GRANT EXECUTE ON FUNCTION complete_site_public(uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_site_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_site_public(uuid) TO service_role;


-- 4. Realtime Configuration (Auto-refresh)
-- Ensure 'checklist_submissions' is in the publication for realtime updates
-- This might fail if the publication doesn't exist, so we wrap in a Do block or just try to add
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'checklist_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_submissions;
  END IF;
END
$$;

-- Notify to force schema cache reload
NOTIFY pgrst, 'reload config';
