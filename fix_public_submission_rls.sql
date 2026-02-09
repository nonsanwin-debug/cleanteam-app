-- Allow Anon to INSERT into checklist_submissions
create policy "Allow Public Insert Checklist"
on checklist_submissions for insert
to anon
with check (true);

-- Allow Anon to UPDATE checklist_submissions (in case of re-submission/upsert logic)
create policy "Allow Public Update Checklist"
on checklist_submissions for update
to anon
using (true);


-- Allow Anon to UPLOAD to site-photos (for Signature)
create policy "Allow Public Upload Site Photos"
on storage.objects for insert
with check ( bucket_id = 'site-photos' );
