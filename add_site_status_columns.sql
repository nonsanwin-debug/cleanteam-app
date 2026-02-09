-- Add missing columns for worker status and claims
-- These are required for 'Start Work', 'Complete Work', and 'Request Payment' features

ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS claimed_amount integer,
ADD COLUMN IF NOT EXISTS payment_status text, -- 'requested', 'paid', 'rejected'
ADD COLUMN IF NOT EXISTS claim_details jsonb,
ADD COLUMN IF NOT EXISTS claim_photos jsonb;

-- Force schema cache refresh (notify PostgREST)
NOTIFY pgrst, 'reload config';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sites';
