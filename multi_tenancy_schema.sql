
-- 1. Reset Data (As requested)
TRUNCATE TABLE public.checklist_submissions, public.photos, public.sites, public.withdrawal_requests, public.users, public.as_requests CASCADE;

-- 2. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID -- Admin's ID (optional reference)
);

-- 3. Update Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- active, pending

-- 4. Update Sites Table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Update Other Tables (Optional, can inherit from site/user, but direct FK is safer for RLS)
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 6. Enable RLS on Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Users can see their own company
CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Update Users Policy (Isolation)
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage company users" ON public.users
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        AND 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );

CREATE POLICY "Users can view company colleagues" ON public.users
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Update Sites Policy (Isolation)
DROP POLICY IF EXISTS "Admins can manage sites" ON public.sites;
CREATE POLICY "Admins can manage company sites" ON public.sites
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        AND 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Workers can view assigned sites" ON public.sites;
CREATE POLICY "Workers can view company sites" ON public.sites
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- 8. Trigger Update for New User (Handle Metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';
    
    -- If Admin, Create Company if not exists
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name, owner_id)
        VALUES (v_company_name, new.id)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name -- Handle name collision gracefully? or fail? Unique constraint will fail if exists.
        RETURNING id INTO v_company_id;
    END IF;

    -- If Worker, Find Company
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name;
        -- If company not found, maybe set to null or fail? 
        -- For now, let's allow null and handle in UI/Logic
    END IF;

    INSERT INTO public.users (id, name, phone, role, company_id)
    VALUES (
        new.id, 
        new.raw_user_meta_data->>'name', 
        new.raw_user_meta_data->>'phone',
        v_role,
        v_company_id
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
