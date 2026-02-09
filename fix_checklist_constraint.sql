-- Add unique constraint to checklist_submissions on site_id
-- This is required for UPSERT to work correctly with onConflict: 'site_id'

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

NOTIFY pgrst, 'reload config';
