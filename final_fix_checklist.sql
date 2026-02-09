-- 1. Ensure Unique Constraint on site_id for UPSERT support
-- This is critical for the "saveChecklistProgress" action to work (onConflict: 'site_id')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'checklist_submissions_site_id_key'
    ) THEN
        ALTER TABLE public.checklist_submissions
        ADD CONSTRAINT checklist_submissions_site_id_key UNIQUE (site_id);
    END IF;
END $$;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public View Submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Worker Manage Submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Worker Insert Submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Worker Update Submissions" ON public.checklist_submissions;

-- 3. Enable RLS
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy: Public Read Access (for /share/[id] page)
CREATE POLICY "Public Read Access" ON public.checklist_submissions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5. Create Policy: Worker Insert/Update Access
-- Workers can INSERT/UPDATE if they are assigned to the site.
CREATE POLICY "Worker Upsert Access" ON public.checklist_submissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = checklist_submissions.site_id
            AND sites.worker_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = checklist_submissions.site_id
            AND sites.worker_id = auth.uid()
        )
    );

NOTIFY pgrst, 'reload config';
