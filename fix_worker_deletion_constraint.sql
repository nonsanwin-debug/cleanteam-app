-- FIX: Allow Deleting Workers with Assigned Sites
-- Currently, you cannot delete a worker if they have sites assigned (Foreign Key Error).
-- We will change the rule: If a worker is deleted, set the site's 'worker_id' to NULL (Unassigned).

DO $$
BEGIN
    -- 1. Sites -> Users (worker_id)
    -- Check if the constraint exists and drop it
    -- Common name: sites_worker_id_fkey
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'sites' AND constraint_name = 'sites_worker_id_fkey'
    ) THEN
        ALTER TABLE public.sites
        DROP CONSTRAINT sites_worker_id_fkey;
    END IF;

    -- Re-create with ON DELETE SET NULL
    ALTER TABLE public.sites
    ADD CONSTRAINT sites_worker_id_fkey
    FOREIGN KEY (worker_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL; -- key change!

END $$;
