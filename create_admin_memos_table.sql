-- Create admin_memos table
CREATE TABLE IF NOT EXISTS public.admin_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    memo_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, memo_date)
);

-- Note: We are not referencing site_id because this memo is per date, not per site.

-- Set up Row Level Security
ALTER TABLE public.admin_memos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Enable ALL for admins based on company_id" ON public.admin_memos;

-- Create Policy
CREATE POLICY "Enable ALL for admins based on company_id" ON public.admin_memos
    USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
