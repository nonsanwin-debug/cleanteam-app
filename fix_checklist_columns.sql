-- Add updated_at and created_at columns if they don't exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'checklist_submissions' and column_name = 'updated_at') then
        alter table checklist_submissions add column updated_at timestamp with time zone default timezone('utc'::text, now());
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'checklist_submissions' and column_name = 'created_at') then
        alter table checklist_submissions add column created_at timestamp with time zone default timezone('utc'::text, now());
    end if;
end $$;

-- Update existing rows to have a valid timestamp if null
update checklist_submissions set updated_at = now() where updated_at is null;
update checklist_submissions set created_at = now() where created_at is null;
