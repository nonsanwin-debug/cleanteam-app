-- 1. Add missing columns for worker status (Idempotent)
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS claimed_amount integer,
ADD COLUMN IF NOT EXISTS claim_details jsonb;

-- 2. Grant permissions to authenticator/service_role/anon if needed
-- (Usually authenticated users can read/update based on RLS)

-- 3. Enable Realtime for 'sites' table
-- This is required for the dashboard to auto-refresh when status changes
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE sites; -- Add other tables if needed like checklist_submissions
COMMIT;
-- Note: In hosted Supabase, 'supabase_realtime' publication usually exists. So we should ALTER instead.
-- ALTER PUBLICATION supabase_realtime ADD TABLE sites;
-- But standard SQL doesn't have IF EXISTS for adding table to publication easily.
-- So we just run the ADD command and if it fails (already added), it's fine.
do $$
begin
  alter publication supabase_realtime add table sites;
exception when duplicate_object then
  null;
end;
$$;


-- 4. Fix RLS for 'update' to allow workers to update status and started_at
-- (If policy already exists, we drop and recreate to be safe)
DROP POLICY IF EXISTS "Workers can update assigned sites" ON public.sites;

CREATE POLICY "Workers can update assigned sites"
  ON public.sites
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is the assigned worker OR is an admin
    auth.uid() = worker_id
    OR
    EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin' )
  )
  WITH CHECK (
    -- Allow if user is the assigned worker OR is an admin
    auth.uid() = worker_id
    OR
    EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin' )
  );

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
