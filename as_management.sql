-- Create AS Requests table
CREATE TABLE IF NOT EXISTS public.as_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Linked worker at the time of AS
    description TEXT NOT NULL,
    processing_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'monitoring')),
    occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
    resolved_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.as_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin: Full access
CREATE POLICY "Admin can do everything on as_requests"
    ON public.as_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Worker: Read-only their own AS requests (optional, but good for future)
-- For now, let's keep it Admin-only based on requirements, but maybe Workers should see it?
-- "팀장별 AS 발생 빈도" implies it's about them.
-- Let's allow Workers to view AS requests related to them.
CREATE POLICY "Worker can view their own AS requests"
    ON public.as_requests
    FOR SELECT
    USING (
        worker_id = auth.uid()
    );

-- Grant permissions
GRANT ALL ON public.as_requests TO authenticated;
GRANT ALL ON public.as_requests TO service_role;

-- Fix permissions for relationships just in case
GRANT SELECT ON public.sites TO authenticated;
GRANT SELECT ON public.users TO authenticated;
