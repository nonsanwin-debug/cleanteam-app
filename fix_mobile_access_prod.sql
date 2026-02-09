-- 1. Grant Usage on Schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant ALL Table Permissions (Simplest fix for public read)
GRANT ALL ON public.sites TO anon, authenticated;
GRANT ALL ON public.photos TO anon, authenticated;
GRANT ALL ON public.checklist_templates TO anon, authenticated;
GRANT ALL ON public.checklist_submissions TO anon, authenticated;

-- 3. Enable RLS (Safety)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Drop potentially conflicting policies
DROP POLICY IF EXISTS "Public View Sites" ON public.sites;
DROP POLICY IF EXISTS "Public View Photos" ON public.photos;
DROP POLICY IF EXISTS "Public View Templates" ON public.checklist_templates;
DROP POLICY IF EXISTS "Public Insert Submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Public Update Sites" ON public.sites;

-- 5. Create Permissive Public Policies
CREATE POLICY "Public View Sites" ON public.sites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public View Photos" ON public.photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public View Templates" ON public.checklist_templates FOR SELECT TO anon, authenticated USING (true);

-- Allow public submission
CREATE POLICY "Public Insert Submissions" ON public.checklist_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Allow public update for site completion (important for signature)
CREATE POLICY "Public Update Sites" ON public.sites FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Reload Config
NOTIFY pgrst, 'reload config';
