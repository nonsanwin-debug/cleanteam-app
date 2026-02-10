-- Restore Admin DELETE policy
-- Previous script dropped "Admins can do everything" but only added SELECT/UPDATE/INSERT policies.
-- We need to explicit allow DELETE for admins.

CREATE POLICY "Admins can delete sites"
ON public.sites FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Also ensure Admins have full access just in case
-- (Actually, let's keep it granular if possible, but "Admins can do everything" is safer for admin app)

-- Re-create "Admins can do everything" for ALL operations if not exists?
-- PostgreSQL policies are OR-ed. So adding a DELETE policy is enough.

-- Let's just add the missing DELETE policy.
