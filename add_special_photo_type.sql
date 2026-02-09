-- Drop existing constraint
ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_type_check;

-- Add new constraint including 'special'
ALTER TABLE public.photos ADD CONSTRAINT photos_type_check 
CHECK (type IN ('before', 'during', 'after', 'special'));
