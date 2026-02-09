-- Improvements for query performance

-- 1. Sites Table
-- Add updated_at column if it does not exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'sites' and column_name = 'updated_at') then
        alter table sites add column updated_at timestamp with time zone default timezone('utc'::text, now());
    end if;
end $$;

-- Update existing rows to have a valid timestamp if null
update sites set updated_at = created_at where updated_at is null;

create index if not exists idx_sites_status on sites(status);
create index if not exists idx_sites_worker_id on sites(worker_id);
create index if not exists idx_sites_created_at on sites(created_at desc);
create index if not exists idx_sites_updated_at on sites(updated_at desc);

-- 2. Photos Table
-- Always queried by site_id
create index if not exists idx_photos_site_id on photos(site_id);
create index if not exists idx_photos_type on photos(type); -- filtering by 'before', 'after' etc

-- 3. Checklist Submissions
-- Always queried by site_id
create index if not exists idx_checklist_submissions_site_id on checklist_submissions(site_id);

-- 4. Users Table
-- Lookups by id are automatic (PK). 
-- 'email' column often exists in auth.users, not necessarily in public.users. 
-- Disabling this index to prevent "column does not exist" error.
-- create index if not exists idx_users_email on users(email);

-- 5. DB Marker (Optimization for simple existence checks?)
-- Not needed, it's a single row table usually.
