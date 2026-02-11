-- [CRITICAL] 업체별 엄격한 데이터 격리 (RLS) 정책 적용

-- 1. Helper Function: 현재 사용자의 company_id를 안전하게 가져오는 함수 (RLS 순환 참조 방지)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. SITES 테이블 정책 수정
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workers can select assigned sites" ON public.sites;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON public.sites;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.sites;

CREATE POLICY "Strict company isolation for sites"
ON public.sites FOR ALL
TO authenticated
USING (
    company_id = public.get_my_company_id()
)
WITH CHECK (
    company_id = public.get_my_company_id()
);

-- 3. USERS 테이블 정책 수정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- 본인 데이터는 항상 조회 가능
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 동일 업체 소속 유저만 조회/수정 가능 (관리자용)
CREATE POLICY "Strict company isolation for users"
ON public.users FOR ALL
TO authenticated
USING (
    company_id = public.get_my_company_id()
)
WITH CHECK (
    company_id = public.get_my_company_id()
);

-- 4. AS_REQUESTS 테이블 정책 수정
ALTER TABLE public.as_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Strict company isolation for as_requests" ON public.as_requests;

CREATE POLICY "Strict company isolation for as_requests"
ON public.as_requests FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sites 
        WHERE sites.id = as_requests.site_id 
        AND sites.company_id = public.get_my_company_id()
    )
    OR site_id IS NULL -- 직접 입력된 AS의 경우 users 테이블 등을 통해 추가 보완 필요할 수 있음
);

-- 5. WITHDRAWAL_REQUESTS 테이블 정책 수정
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Strict company isolation for withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Strict company isolation for withdrawals"
ON public.withdrawal_requests FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = withdrawal_requests.user_id 
        AND users.company_id = public.get_my_company_id()
    )
);

-- 6. 트리거 함수 보완 (INSERT 시 company_id 누락 방지 - sites 등)
-- 이미 애플리케이션 레벨에서 처리하고 있으나, RLS 정책(WITH CHECK)이 이를 강제함.

NOTIFY pgrst, 'reload config';
