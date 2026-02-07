-- Migration: Add detailed fields to sites table

ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS residential_type TEXT, -- e.g., 아파트, 빌라, 상가
ADD COLUMN IF NOT EXISTS area_size TEXT,        -- e.g., 24평
ADD COLUMN IF NOT EXISTS structure_type TEXT,   -- e.g., 방3 화2
ADD COLUMN IF NOT EXISTS cleaning_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- Update existing rows to have default values if necessary (optional)
-- UPDATE public.sites SET cleaning_date = CURRENT_DATE WHERE cleaning_date IS NULL;
