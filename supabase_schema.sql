-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Extends Supabase Auth)
-- Note: 'users' table manages role-based access. 
-- New users should be capable of signing up, but roles might need admin assignment or default to 'worker'.
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')) DEFAULT 'worker',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for Users
-- Admins can view/edit all users.
-- Workers can view their own profile.
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (
  auth.uid() = id
);

-- Trigger to create public.users record on auth.users signup
-- (Optional: simplifies user creation flow)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'name', COALESCE(new.raw_user_meta_data->>'role', 'worker'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. SITES TABLE
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed')) DEFAULT 'scheduled',
  worker_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Policies for Sites
-- Admins can do everything.
-- Workers can view sites assigned to them.
CREATE POLICY "Admins can manage sites" ON public.sites FOR ALL USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Workers can view assigned sites" ON public.sites FOR SELECT USING (
  worker_id = auth.uid() OR exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- 3. CHECKLIST TEMPLATES (Admin only mostly)
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  items JSONB NOT NULL, -- Structure: [{ id: 1, text: "Enterance", required: true }, ...]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read templates" ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.checklist_templates FOR ALL USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);


-- 4. CHECKLIST SUBMISSIONS
CREATE TABLE public.checklist_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.users(id),
  data JSONB NOT NULL, -- The filled checklist data
  started_at_gps TEXT, -- Storing as text for simplicity "lat,lng" or JSON
  signature_url TEXT,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all submissions" ON public.checklist_submissions FOR SELECT USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Workers can create submissions" ON public.checklist_submissions FOR INSERT WITH CHECK (
  auth.uid() = worker_id
);

CREATE POLICY "Workers can view own submissions" ON public.checklist_submissions FOR SELECT USING (
  auth.uid() = worker_id
);


-- 5. PHOTOS (For Gallery and Site Reports)
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('before', 'during', 'after')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage photos" ON public.photos FOR ALL USING (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

CREATE POLICY "Workers can upload photos to their sites" ON public.photos FOR INSERT WITH CHECK (
  exists (
    select 1 from public.sites 
    where id = site_id 
    and (worker_id = auth.uid() OR exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  )
);

CREATE POLICY "Workers can view photos of their sites" ON public.photos FOR SELECT USING (
  exists (
    select 1 from public.sites 
    where id = site_id 
    and (worker_id = auth.uid() OR exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  )
);

-- STORAGE BUCKET POLICIES (Conceptual - needs to be applied in Storage UI or via SQL if enabled)
-- Bucket: 'site-photos'
-- Policy: Give insert access to authenticated users.
-- Policy: Give select access to authenticated users.
