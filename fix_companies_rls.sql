-- Fix companies RLS policy to allow users to view their company
-- Current policy is too restrictive and causes circular reference

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

-- Create new policy: users can view companies they belong to
CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT 
    USING (
        id IN (
            SELECT company_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Verify policy
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'companies';
