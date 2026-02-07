-- [긴급 수정] 1. 기존 복잡한 정책 싹 다 제거
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable access to all users" ON public.users;

-- 2. "로그인만 하면 다 허용" 하는 개발용 프리패스 정책 적용
CREATE POLICY "Dev Allow All" ON public.users FOR ALL USING (
  auth.role() = 'authenticated'
);

-- 3. 트리거 잠시 끄기 (클라이언트 로직과 충돌 방지)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. 현재 가입된 모든 유저를 'public.users' 테이블에 강제로 넣고 관리자로 만듦
INSERT INTO public.users (id, name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', '관리자'), 
  'admin'
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'admin'; -- 이미 있어도 관리자로 덮어쓰기

-- 5. 결과 확인
SELECT * FROM public.users;
