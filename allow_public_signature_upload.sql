-- Allow anonymous uploads to site-photos bucket, but only for signatures folder
CREATE POLICY "Public Upload Signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-photos' AND (storage.foldername(name))[1] = 'signatures'
);

-- Allow anonymous read (already likely enabled if public bucket, but ensure)
-- CREATE POLICY "Public Read Photos" ON storage.objects FOR SELECT USING (bucket_id = 'site-photos');
