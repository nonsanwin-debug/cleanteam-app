-- 1. Add column if it doesn't exist
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS worker_name TEXT;

-- 2. Backfill data from users table
UPDATE public.sites s
SET worker_name = u.name
FROM public.users u
WHERE s.worker_id = u.id;

-- 3. Grant permission on the new column (covered by GRANT ALL ON sites, but good to be sure)
GRANT SELECT(worker_name) ON public.sites TO anon, authenticated;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload config';
