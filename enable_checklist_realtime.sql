-- Check and Enable Realtime for checklist_submissions table
-- This ensures that customer page receives updates when worker saves progress

-- 1. Check current Realtime publications
SELECT * FROM pg_publication_tables WHERE tablename = 'checklist_submissions';

-- 2. If not enabled, add the table to the realtime publication
-- (Supabase uses 'supabase_realtime' publication by default)
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_submissions;

-- 3. Verify it was added
SELECT * FROM pg_publication_tables WHERE tablename = 'checklist_submissions';
