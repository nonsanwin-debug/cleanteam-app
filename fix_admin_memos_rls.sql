-- Drop existing strict policy
DROP POLICY IF EXISTS "Enable ALL for admins based on company_id" ON public.admin_memos;
DROP POLICY IF EXISTS "Enable ALL for users based on company_id" ON public.admin_memos;

-- Create simpler policy based on users table company_id
CREATE POLICY "Enable ALL for users based on company_id" ON public.admin_memos
    FOR ALL
    USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );
