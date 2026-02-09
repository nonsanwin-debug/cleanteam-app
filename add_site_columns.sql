-- Add all missing columns for sites table
-- These columns are referenced in the UI but might not exist in the DB

ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS residential_type text,
ADD COLUMN IF NOT EXISTS area_size text,
ADD COLUMN IF NOT EXISTS structure_type text,
ADD COLUMN IF NOT EXISTS cleaning_date text, -- Using text for YYYY-MM-DD
ADD COLUMN IF NOT EXISTS start_time text,    -- Using text for HH:mm
ADD COLUMN IF NOT EXISTS special_notes text,
ADD COLUMN IF NOT EXISTS worker_name text,   -- For quicker access
ADD COLUMN IF NOT EXISTS worker_phone text;  -- For quicker access

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sites';
