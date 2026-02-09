-- RPC to get checklist template securely (Public)
CREATE OR REPLACE FUNCTION get_public_checklist_template(p_id UUID)
RETURNS SETOF public.checklist_templates
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.checklist_templates WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_public_checklist_template(UUID) TO anon, authenticated, service_role;

-- Also need a way to get the latest template if no ID is provided, securely
CREATE OR REPLACE FUNCTION get_public_latest_checklist_template()
RETURNS SETOF public.checklist_templates
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.checklist_templates ORDER BY created_at DESC LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_latest_checklist_template() TO anon, authenticated, service_role;
