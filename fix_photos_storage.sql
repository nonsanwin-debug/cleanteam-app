-- 1. Ensure 'site-photos' bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-photos', 'site-photos', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies (Bucket Level)
-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Allow public access to view photos (essential for displaying images)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'site-photos' );

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'site-photos' );

-- Allow authenticated users to delete their own photos
-- (For simplicity, allowing authenticated users to delete from this bucket)
CREATE POLICY "Authenticated Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'site-photos' );


-- 3. Database Table Policies (public.photos)
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.photos;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.photos;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.photos;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.photos;

-- Create expansive policies for authenticated users
-- Since workers need to upload photos to sites they might not "own" in a strict sense (assigned via check)
-- we allow authenticated users to perform actions on the photos table.
-- Refinements can be added later if needed.

CREATE POLICY "Enable insert for authenticated users" 
ON public.photos FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users" 
ON public.photos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete for authenticated users" 
ON public.photos FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.photos FOR UPDATE 
TO authenticated 
USING (true);
