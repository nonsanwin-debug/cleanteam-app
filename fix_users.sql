-- 1. Sync all auth.users to public.users (safely)
INSERT INTO public.users (id, name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', '사용자'),
  COALESCE(raw_user_meta_data->>'role', 'worker')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Force Admin Role for specific email (Replace with your email)
-- UPDATE public.users 
-- SET role = 'admin' 
-- WHERE id IN (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');

-- 3. Check results
SELECT u.name, u.role, a.email 
FROM public.users u 
JOIN auth.users a ON u.id = a.id;
