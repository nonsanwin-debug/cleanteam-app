-- 1. Checklist Submissions Permissions
alter table checklist_submissions enable row level security;

-- Drop all existing policies to start fresh
drop policy if exists "Enable read access for all users" on checklist_submissions;
drop policy if exists "Enable insert for authenticated users only" on checklist_submissions;
drop policy if exists "Enable update for users based on worker_id" on checklist_submissions;
drop policy if exists "Enable update for users based on site_id" on checklist_submissions;
drop policy if exists "Allow ALL for authenticated" on checklist_submissions;
drop policy if exists "Allow SELECT for anon" on checklist_submissions;
drop policy if exists "Allow ALL" on checklist_submissions;

-- Allow Anon (Public/Customer) to READ ONLY
create policy "Allow Public SELECT"
on checklist_submissions for select
to anon
using (true);

-- Allow Authenticated (Worker) to DO EVERYTHING (Insert, Update, Select)
create policy "Allow Worker ALL"
on checklist_submissions for all
to authenticated
using (true)
with check (true);


-- 2. Storage Permissions (Photos & Signatures)
-- Drop existing policies
drop policy if exists "Allow Public Read Site Photos" on storage.objects;
drop policy if exists "Allow Authenticated Upload Site Photos" on storage.objects;
drop policy if exists "Authenticated users can upload site photos" on storage.objects;
drop policy if exists "Allow ALL Storage" on storage.objects;

-- Allow Public READ for site-photos bucket
create policy "Allow Public Read Site Photos"
on storage.objects for select
using ( bucket_id = 'site-photos' );

-- Allow Authenticated UPLOAD for site-photos bucket
create policy "Allow Worker Upload Site Photos"
on storage.objects for insert
with check ( bucket_id = 'site-photos' and auth.role() = 'authenticated' );
