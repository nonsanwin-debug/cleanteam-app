-- 1. Make worker_id nullable in checklist_submissions
ALTER TABLE public.checklist_submissions ALTER COLUMN worker_id DROP NOT NULL;

-- 2. RPC to get site details securely (Public)
CREATE OR REPLACE FUNCTION get_public_site(p_id UUID)
RETURNS SETOF public.sites
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.sites WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION get_public_site(UUID) TO anon, authenticated, service_role;

-- 3. RPC to get site photos securely (Public)
CREATE OR REPLACE FUNCTION get_public_photos(p_site_id UUID)
RETURNS SETOF public.photos
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.photos WHERE site_id = p_site_id ORDER BY created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_public_photos(UUID) TO anon, authenticated, service_role;

-- 4. RPC to submit checklist (Public)
CREATE OR REPLACE FUNCTION submit_public_checklist(
  p_site_id UUID,
  p_data JSONB,
  p_signature_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission_id UUID;
BEGIN
  -- Insert submission
  INSERT INTO public.checklist_submissions (site_id, data, signature_url, status)
  VALUES (p_site_id, p_data, p_signature_url, 'submitted')
  RETURNING id INTO v_submission_id;

  -- Update site status
  UPDATE public.sites
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_site_id;

  RETURN jsonb_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_public_checklist(UUID, JSONB, TEXT) TO anon, authenticated, service_role;
