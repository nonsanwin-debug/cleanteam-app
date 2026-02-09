-- Comprehensive permission fix
-- Sometimes RLS is fine but the role doesn't have basic SELECT permissions

-- 1. Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Ensure future tables happen automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- 4. Double check RLS is enabled (it should be, but good to check)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 5. Force refresh schema cache (sometimes helps)
NOTIFY pgrst, 'reload config';

-- Test query for the specific user (to verify it exists and is visible)
-- Change the ID to the one you see in the debug panel
SELECT * FROM public.users LIMIT 1;
