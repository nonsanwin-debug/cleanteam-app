-- add_company_points.sql
-- Adds the `points` and `status` columns to the `companies` table.

-- Add status column (pending, approved, rejected, deleted)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')) DEFAULT 'pending';

-- Add points column
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Update existing companies to be 'approved' by default since they were created before this system
UPDATE public.companies SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- 2. Create the `wallet_logs` equivalent for companies if we want to trace point changes?
-- For now, we will simply refund/deduct points directly from the companies table inside the RPC or server actions.

-- Let's check if the table changed successfully.
SELECT id, name, status, points FROM public.companies LIMIT 5;
