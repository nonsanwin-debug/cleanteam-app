-- Check if 'sites' table is in the 'supabase_realtime' publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'sites';

-- If it returns no rows across, then Realtime is NOT enabled for 'sites'.

-- Force Enable (Idempotent-ish)
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

-- Check RLS Policy for Select again
-- Workers need to be able to SELECT rows that are assigned to them to receive updates.
-- Verify existing policies.
SELECT * FROM pg_policies WHERE tablename = 'sites';
