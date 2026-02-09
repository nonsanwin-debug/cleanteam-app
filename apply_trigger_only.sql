-- This script applies the full schema to Supabase
-- Run this in Supabase SQL Editor if the TypeScript script doesn't work

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 6. SIGNUP TRIGGER (Most Important for Company Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';
    
    -- Create company for admin
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name, owner_id)
        VALUES (v_company_name, new.id)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- Find company for worker
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name;
    END IF;

    -- Create user profile
    INSERT INTO public.users (id, name, role, company_id, status)
    VALUES (new.id, new.raw_user_meta_data->>'name', v_role, v_company_id, 'active')
    ON CONFLICT (id) DO UPDATE 
    SET name = EXCLUDED.name,
        role = EXCLUDED.role,
        company_id = EXCLUDED.company_id;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Verify trigger was created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
