-- Enable RLS (just in case)
alter table checklist_submissions enable row level security;

-- Remove potentially conflicting policies
drop policy if exists "Enable read access for all users" on checklist_submissions;
drop policy if exists "Enable insert for authenticated users only" on checklist_submissions;
drop policy if exists "Enable update for users based on worker_id" on checklist_submissions;
drop policy if exists "Enable update for users based on site_id" on checklist_submissions;
drop policy if exists "Allow ALL for authenticated" on checklist_submissions;
drop policy if exists "Allow SELECT for anon" on checklist_submissions;
drop policy if exists "Authenticated users can upload site photos" on storage.objects;

-- 1. Customer Access (Public/Anon) - Read Only
create policy "Allow SELECT for anon"
on checklist_submissions for select
to anon
using (true);

-- 2. Worker Access (Authenticated) - Full Access
-- This allows any logged-in worker to Insert/Update/Select any submission.
-- Given the small team size, this prevents "ownership" bugs.
create policy "Allow ALL for authenticated"
on checklist_submissions for all
to authenticated
using (true)
with check (true);

-- 3. Storage Policy (Ensure signatures can be uploaded)
-- Allow public read access to site-photos
create policy "Allow Public Read Site Photos"
on storage.objects for select
using ( bucket_id = 'site-photos' );

-- Allow authenticated users to upload to site-photos
create policy "Allow Authenticated Upload Site Photos"
on storage.objects for insert
with check ( bucket_id = 'site-photos' and auth.role() = 'authenticated' );
