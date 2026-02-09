-- 1. Enable RLS on checklist_submissions
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public (Anon) to INSERT and UPDATE checklist_submissions
-- Existing policies might be blocking. Drop them to be safe or create new ones.
DROP POLICY IF EXISTS "Public Enable Insert" ON checklist_submissions;
DROP POLICY IF EXISTS "Public Enable Update" ON checklist_submissions;
DROP POLICY IF EXISTS "Public Enable Select" ON checklist_submissions;

CREATE POLICY "Public Enable Insert" ON checklist_submissions
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public Enable Update" ON checklist_submissions
FOR UPDATE TO anon, authenticated
USING (true);

CREATE POLICY "Public Enable Select" ON checklist_submissions
FOR SELECT TO anon, authenticated
USING (true);

-- 3. Allow Public Uploads to Storage (signatures)
-- Ensure 'site-photos' bucket allows public inserts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-photos', 'site-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Upload Signatures" ON storage.objects;

CREATE POLICY "Public Upload Signatures" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
    bucket_id = 'site-photos' 
    AND (storage.foldername(name))[1] = 'signatures'
);

-- Allow public to select (view) their uploaded signatures
DROP POLICY IF EXISTS "Public View Signatures" ON storage.objects;
CREATE POLICY "Public View Signatures" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'site-photos');

-- 4. Fix sites access just in case
GRANT SELECT ON sites TO anon;
