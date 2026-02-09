-- Force update the bucket to be public
-- (The previous script used ON CONFLICT DO NOTHING, so if it existed as private, it stayed private)
UPDATE storage.buckets
SET public = true
WHERE id = 'site-photos';

-- Ensure the bucket exists if it didn't (fallback)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-photos', 'site-photos', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Re-apply the public access policy just in case
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Explicitly targeting 'public' role (anon + authenticated)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'site-photos' );

-- Ensure authenticated upload is correct
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'site-photos' );

-- Verify
SELECT id, name, public FROM storage.buckets WHERE id = 'site-photos';
