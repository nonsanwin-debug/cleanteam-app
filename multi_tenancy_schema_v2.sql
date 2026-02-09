
-- 1. Create Missing Tables (Checklists)
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    data JSONB,
    signature_url TEXT,
    status TEXT DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT checklist_submissions_site_id_key UNIQUE (site_id)
);

-- Enable RLS for these tables
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Reset Data (As requested)
TRUNCATE TABLE public.checklist_submissions, public.photos, public.sites, public.withdrawal_requests, public.users, public.as_requests CASCADE;

-- 3. Create Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID -- Admin's ID (optional reference)
);

-- 4. Update Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- active, pending

-- 5. Update Sites Table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 6. Update Withdrawal Requests Table
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 7. Update Checklist Templates (Optional: Shared or Per Company?)
-- For now, let's make templates global or shared. 
-- Ideally, they should be company-specific too.
ALTER TABLE public.checklist_templates
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 8. Enable RLS on Companies (Already enabled above? No, only Checklists)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
-- Users can see their own company
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Users Policy: Isolation
DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
CREATE POLICY "Admins can manage company users" ON public.users
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        AND 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Users can view company colleagues" ON public.users;
CREATE POLICY "Users can view company colleagues" ON public.users
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Sites Policy: Isolation
DROP POLICY IF EXISTS "Admins can manage company sites" ON public.sites;
CREATE POLICY "Admins can manage company sites" ON public.sites
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        AND 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Workers can view company sites" ON public.sites;
CREATE POLICY "Workers can view company sites" ON public.sites
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Checklist Templates Policy
DROP POLICY IF EXISTS "Admins can manage company templates" ON public.checklist_templates;
CREATE POLICY "Admins can manage company templates" ON public.checklist_templates
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
        AND 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    );
-- Allow global templates (company_id IS NULL) or company templates
DROP POLICY IF EXISTS "Users can view templates" ON public.checklist_templates;
CREATE POLICY "Users can view templates" ON public.checklist_templates
    FOR SELECT USING (
        company_id IS NULL 
        OR 
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    );


-- 10. Trigger Update for New User (Handle Metadata)
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
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- If Worker, Find Company
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name;
    END IF;

    INSERT INTO public.users (id, name, role, company_id, status)
    VALUES (new.id, new.raw_user_meta_data->>'name', v_role, v_company_id, 'active');
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
