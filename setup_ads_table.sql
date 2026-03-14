-- 1. Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    image_url text NOT NULL,
    link_url text NOT NULL,
    placement text NOT NULL,
    is_active boolean DEFAULT true,
    max_impressions integer DEFAULT 1000,
    impressions_count integer DEFAULT 0,
    clicks_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup Row Level Security (RLS)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active ads that haven't reached max impressions
CREATE POLICY "Public can view active ads" ON public.ads
    FOR SELECT
    USING (is_active = true AND impressions_count < max_impressions);

-- Policy: Masters can manage all ads (Assuming service_role bypasses RLS or handled via server actions bypassing RLS using service key, 
-- but we will use the admin client on the backend which bypasses RLS). 
-- For safety, we can add an authenticated policy for viewing all ads.
CREATE POLICY "Authenticated users can view all ads" ON public.ads
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert ads" ON public.ads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update ads" ON public.ads
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete ads" ON public.ads
    FOR DELETE
    TO authenticated
    USING (true);


-- 3. Create increment functions (RPC) for atomic updates
CREATE OR REPLACE FUNCTION increment_ad_impression(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ads
  SET impressions_count = impressions_count + 1
  WHERE id = ad_id AND is_active = true AND impressions_count < max_impressions;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ad_click(ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.ads
  SET clicks_count = clicks_count + 1
  WHERE id = ad_id;
END;
$$;
