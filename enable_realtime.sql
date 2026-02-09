-- Enable Realtime for checklist_submissions table
-- This requires the 'supabase_realtime' publication to exist (default in Supabase)

begin;
  -- Add table to publication
  alter publication supabase_realtime add table checklist_submissions;
commit;

-- Force RLS to allow public to subscribe? 
-- Realtime respects RLS. We already gave "Select for Anon" policy, so it should work.
