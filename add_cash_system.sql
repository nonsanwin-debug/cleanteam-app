-- Add cash column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cash NUMERIC DEFAULT 0;

-- Create cash_requests table
CREATE TABLE IF NOT EXISTS public.cash_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    method TEXT, -- 'credit_card', 'bank_transfer', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.cash_requests ENABLE ROW LEVEL SECURITY;

-- Admins can view and insert their own requests
DROP POLICY IF EXISTS "Admins can manage own requests" ON public.cash_requests;
CREATE POLICY "Admins can manage own requests" ON public.cash_requests
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Master can view all requests
-- (We assume master accesses via service_role or admin client in server actions, so no explicit policy needed for them here, or we can add one if master is a separate role)
