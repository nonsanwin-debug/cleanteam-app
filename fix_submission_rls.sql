-- Allow authenticated users (workers) to INSERT/UPDATE/SELECT their own submissions
-- We use a broad policy for authenticated users on this table since they are the ones creating/editing these.

CREATE POLICY "Worker Manage Submissions" ON public.checklist_submissions
    FOR ALL
    TO authenticated
    USING (auth.uid() = worker_id)
    WITH CHECK (auth.uid() = worker_id);

-- Also ensure 'anon' (customer) can READ the submissions for the site (to see the checks)
-- The previous 'Public Insert' only allowed insert. We need SELECT for anon if they know the site_id?
-- Actually, how does anon read?
-- getPublicChecklistSubmission calls .select()
-- So we need a SELECT policy for anon.
-- "Public View Sites" exists.
-- We need "Public View Submissions"

CREATE POLICY "Public View Submissions" ON public.checklist_submissions
    FOR SELECT
    TO anon, authenticated
    USING (true); -- Or linking to site? 'true' is simplest given ID inference.

-- Reload config
NOTIFY pgrst, 'reload config';
