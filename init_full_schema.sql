
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE (Top level hierarchy)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID -- Validated by application logic or trigger
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. USERS TABLE (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')) DEFAULT 'worker',
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  account_info TEXT, -- For payments
  current_money INTEGER DEFAULT 0, -- Wallet balance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. SITES TABLE
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed')) DEFAULT 'scheduled',
  worker_id UUID REFERENCES public.users(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Payment & Claims
  claimed_amount INTEGER,
  payment_status TEXT CHECK (payment_status IN ('requested', 'paid')),
  claim_details JSONB DEFAULT '[]'::JSONB,
  claim_photos JSONB DEFAULT '[]'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Template override (optional)
  template_id UUID 
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sites_payment_status ON public.sites(payment_status);

-- 4. CHECKLIST TEMPLATES
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- 5. CHECKLIST SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.checklist_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  data JSONB,
  signature_url TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT checklist_submissions_site_id_key UNIQUE (site_id)
);

ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

-- 6. PHOTOS
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('before', 'during', 'after', 'special')),
  description TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- 7. AS REQUESTS
CREATE TABLE IF NOT EXISTS public.as_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    processing_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'monitoring')),
    occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
    resolved_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.as_requests ENABLE ROW LEVEL SECURITY;

-- 8. WITHDRAWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;


-- 9. RLS POLICIES (Comprehensive)

-- COMPANIES
CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- USERS
CREATE POLICY "Admins can manage company users" ON public.users FOR ALL USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can view company colleagues" ON public.users FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
);
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (
    auth.uid() = id
);
-- Needed for signup trigger to work smoothly usually service_role handles insertion, 
-- but sometimes authenticated needs to read.

-- SITES
CREATE POLICY "Admins can manage company sites" ON public.sites FOR ALL USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Workers can view company sites" ON public.sites FOR SELECT USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
);

-- CHECKLIST TEMPLATES
CREATE POLICY "Admins can manage company templates" ON public.checklist_templates FOR ALL USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can view templates" ON public.checklist_templates FOR SELECT USING (
    company_id IS NULL 
    OR company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
);

-- CHECKLIST SUBMISSIONS
CREATE POLICY "Admins can manage submissions" ON public.checklist_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = checklist_submissions.site_id 
            AND sites.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
            AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);
CREATE POLICY "Workers can manage their submissions" ON public.checklist_submissions FOR ALL USING (
    worker_id = auth.uid()
);
CREATE POLICY "Workers can view submissions for their sites" ON public.checklist_submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = checklist_submissions.site_id 
            AND sites.worker_id = auth.uid())
);

-- PHOTOS
CREATE POLICY "Admins can manage photos" ON public.photos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = photos.site_id 
            AND sites.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
            AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);
CREATE POLICY "Workers can manage photos" ON public.photos FOR ALL USING (
     EXISTS (SELECT 1 FROM public.sites WHERE sites.id = photos.site_id 
            AND sites.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
);
-- Note: Simplified worker policy for photos to ensure upload works.

-- AS REQUESTS
CREATE POLICY "Admins can manage AS requests" ON public.as_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = as_requests.site_id 
            AND sites.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
            AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);
CREATE POLICY "Workers can view/create AS requests" ON public.as_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sites WHERE sites.id = as_requests.site_id 
            AND sites.company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
);

-- WITHDRAWAL REQUESTS
CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (
    auth.uid() = user_id
);
CREATE POLICY "Users can create withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (
    auth.uid() = user_id
);
CREATE POLICY "Admins can manage company withdrawals" ON public.withdrawal_requests FOR ALL USING (
    company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
     AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);


-- 10. SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';
    
    -- Admin: Create Company or Find
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name, owner_id)
        VALUES (v_company_name, new.id)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- Worker: Find Company
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name;
    END IF;

    INSERT INTO public.users (id, name, role, company_id, status)
    VALUES (new.id, new.raw_user_meta_data->>'name', v_role, v_company_id, 'active');
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

