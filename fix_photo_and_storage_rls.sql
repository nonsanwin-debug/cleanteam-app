
-- 1. Storage setup for 'site-photos'
-- Ensure the bucket exists (this is idempotent in Supabase usually, but good to be explicit in instructions)
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Storage Policy: Allow Public Read
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'site-photos' );

-- Storage Policy: Allow Authenticated Upload (Workers)
create policy "Worker Upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'site-photos' );

-- Storage Policy: Allow Worker Update (if needed)
create policy "Worker Update"
on storage.objects for update
to authenticated
using ( bucket_id = 'site-photos' );

-- 2. Photos Table RLS
-- Enable RLS
alter table photos enable row level security;

-- Policy: Allow Read for Everyone (or at least Authenticated)
create policy "Enable read access for all users"
on photos for select
using ( true );

-- Policy: Allow Insert for Authenticated Users (Workers)
-- Ideally we check if the worker is assigned to the site, but for now allow all auth users to unblock.
create policy "Enable insert for authenticated users"
on photos for insert
to authenticated
with check ( true );

-- Policy: Allow Update/Delete for own photos (optional, but good practice)
-- Assuming we might add owner_id later, but for now, maybe just Admin?
-- Let's stick to Insert fix first.
