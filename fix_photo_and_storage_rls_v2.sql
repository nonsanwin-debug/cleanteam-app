
-- 1. Storage setup for 'site-photos'
-- Ensure the bucket exists (this is idempotent in Supabase usually, but good to be explicit in instructions)
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do nothing;

-- Skip 'alter table storage.objects enable row level security;' as it requires ownership.
-- It is enabled by default in Supabase Storage.

-- Drop existing policies to avoid conflicts (if previously partially applied)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Worker Upload" on storage.objects;
drop policy if exists "Worker Update" on storage.objects;

-- Storage Policy: Allow Public Read (Wait, only check valid bucket)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'site-photos' );

-- Storage Policy: Allow Authenticated Upload (Workers)
create policy "Worker Upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'site-photos' );

-- Storage Policy: Allow Worker Update (optional)
create policy "Worker Update"
on storage.objects for update
to authenticated
using ( bucket_id = 'site-photos' );

-- 2. Photos Table RLS (Public Schema)
-- Safe to enable RLS on public table if you are owner (which usually is true for created tables)
alter table photos enable row level security;

-- Drop existing policies for photos
drop policy if exists "Enable read access for all users" on photos;
drop policy if exists "Enable insert for authenticated users" on photos;

-- Policy: Allow Read for Everyone
create policy "Enable read access for all users"
on photos for select
using ( true );

-- Policy: Allow Insert for Authenticated Users (Workers)
create policy "Enable insert for authenticated users"
on photos for insert
to authenticated
with check ( true );
