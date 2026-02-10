-- COMPREHENSIVE FIX: Customer Page Auto-Refresh
-- This ensures that when worker saves progress, customer page updates immediately

-- 1. Enable Realtime for checklist_submissions table
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public'
        AND tablename = 'checklist_submissions'
    ) THEN
        -- Add table to realtime publication
        ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_submissions;
        RAISE NOTICE 'Added checklist_submissions to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'checklist_submissions already in supabase_realtime publication';
    END IF;
END $$;

-- 2. Ensure RLS allows public read access to checklist_submissions
-- (Customer page needs to read this data without authentication)
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if exists
DROP POLICY IF EXISTS "Allow public read for checklist submissions" ON public.checklist_submissions;

-- Create policy to allow anyone to read checklist submissions
CREATE POLICY "Allow public read for checklist submissions"
ON public.checklist_submissions
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Verify the setup
SELECT 
    'Realtime Publication Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'checklist_submissions'
        ) THEN '✓ Enabled'
        ELSE '✗ Not Enabled'
    END as status;

SELECT 
    'RLS Policy Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'checklist_submissions' 
            AND policyname = 'Allow public read for checklist submissions'
        ) THEN '✓ Policy Exists'
        ELSE '✗ Policy Missing'
    END as status;
