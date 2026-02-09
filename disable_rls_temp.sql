-- NUCLEAR OPTION: Temporarily Disable RLS on users table
-- This will confirm if RLS is the problem or if it's something else (e.g. wrong DB)

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Also disable on companies just to be super sure
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- If this works, we know the issue is RLS policies.
-- If this DOES NOT work, then the Vercel app is connected to a DIFFERENT database 
-- than the one we are looking at in the SQL Editor.
