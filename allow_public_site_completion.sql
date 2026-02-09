-- Secure function to allow public/anon to mark a site as completed
create or replace function complete_site_public(target_site_id uuid)
returns void
language plpgsql
security definer -- Runs with privileges of the creator (admin)
as $$
begin
  update sites
  set 
    status = 'completed',
    completed_at = now()
  where id = target_site_id;
end;
$$;

-- Grant execute permission to everyone (including anon)
grant execute on function complete_site_public(uuid) to anon;
grant execute on function complete_site_public(uuid) to authenticated;
grant execute on function complete_site_public(uuid) to service_role;
