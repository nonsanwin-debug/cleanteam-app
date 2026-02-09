-- 1. Enable RLS
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Workers can select assigned sites" ON public.sites;
DROP POLICY IF EXISTS "Workers can update assigned sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can do everything" ON public.sites;

-- 3. Create SELECT policy for Workers
-- Allow workers to see sites where they are assigned
CREATE POLICY "Workers can select assigned sites"
ON public.sites FOR SELECT
TO authenticated
USING (
  auth.uid() = worker_id
  OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 4. Create UPDATE policy for Workers (Status, Started At, etc.)
CREATE POLICY "Workers can update assigned sites"
ON public.sites FOR UPDATE
TO authenticated
USING (
  auth.uid() = worker_id
  OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
)
WITH CHECK (
  auth.uid() = worker_id
  OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 5. Create INSERT policy (Admin or Authenticated)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sites;

CREATE POLICY "Enable insert for authenticated users"
ON public.sites FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Enable Realtime for 'sites' (Idempotent-ish)
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'sites'
  ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE sites;
  END IF;
END $$;

NOTIFY pgrst, 'reload config';
