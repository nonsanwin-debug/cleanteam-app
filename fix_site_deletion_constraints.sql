-- Fix Foreign Key Constraints for Site Deletion
-- If sites are referenced by other tables without ON DELETE CASCADE, deletion will fail.

-- 1. Check and Fix 'photos' table
DO $$
BEGIN
    -- Drop existing constraint if it exists (we don't know the exact name, so we try to find it or just drop generic ones if named predictably)
    -- Actually, safer to ALTER column to drop constraint.
    -- Let's try to add ON DELETE CASCADE to site_id in photos
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'photos' AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- We can't easily know the constraint name to drop it dynamically without complex dynamic SQL.
        -- But we can try to generic approach or assume standard naming if we created it.
        -- Alternative: Re-create the table? No, data loss.
        
        -- Let's try to DROP the constraint by name if we can guess it, or look it up.
        -- Common default name: photos_site_id_fkey
        
        ALTER TABLE public.photos
        DROP CONSTRAINT IF EXISTS photos_site_id_fkey;
        
        ALTER TABLE public.photos
        ADD CONSTRAINT photos_site_id_fkey
        FOREIGN KEY (site_id)
        REFERENCES public.sites(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Check and Fix 'checklist_submissions' table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'checklist_submissions'
    ) THEN
        ALTER TABLE public.checklist_submissions
        DROP CONSTRAINT IF EXISTS checklist_submissions_site_id_fkey;
        
        ALTER TABLE public.checklist_submissions
        ADD CONSTRAINT checklist_submissions_site_id_fkey
        FOREIGN KEY (site_id)
        REFERENCES public.sites(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Check and Fix 'withdrawal_requests' (Unlikely related to sites, but checking)
-- withdrawal_requests links to users, not sites.

-- 4. Re-verify Admin Delete Policy (Just in case)
DROP POLICY IF EXISTS "Admins can delete sites" ON public.sites;

CREATE POLICY "Admins can delete sites"
ON public.sites FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 5. Grant DELETE permission explicitly to authenticated users (controlled by RLS)
GRANT DELETE ON public.sites TO authenticated;

-- 6. Also enable DELETE for related tables just in case RLS checks block CASCADE
CREATE POLICY "Admins can delete photos"
ON public.photos FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admins can delete checklists"
ON public.checklist_submissions FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
