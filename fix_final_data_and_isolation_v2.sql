-- [FINAL FIX] 업체 정보 표시 및 데이터 격리(RLS) 완결판

-- 1. 고유 코드 도우미 함수 (순환 참조 방지)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. 관리자 정보(성함, 업체코드)가 표시되지 않는 문제 해결 (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies are viewable by assigned users" ON public.companies;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Strict company isolation for users" ON public.users;

-- 업체 정보 조회 정책: 본인 소속 업체는 항상 조회 가능해야 함
CREATE POLICY "Companies are viewable by assigned users"
ON public.companies FOR SELECT
TO authenticated
USING (
  id = public.get_my_company_id() OR owner_id = auth.uid()
);

-- 유저 프로필 조회 정책: 본인 및 같은 업체 소속 유저 조회 가능
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all user data" ON public.users;

CREATE POLICY "Users can read own row" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read company workers" ON public.users FOR SELECT USING (company_id = public.get_my_company_id());

-- 3. 데이터 격리 정책 (SITES)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Strict company isolation for sites" ON public.sites;
DROP POLICY IF EXISTS "Workers can select assigned sites" ON public.sites;
DROP POLICY IF EXISTS "Enable select for users based on company_id" ON public.sites;

CREATE POLICY "Strict company isolation for sites"
ON public.sites FOR ALL
TO authenticated
USING ( company_id = public.get_my_company_id() )
WITH CHECK ( company_id = public.get_my_company_id() );

-- 4. 회원가입 트리거 수정 (신규 가입 시 업체 생성 및 코드 발급 보장)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_company_code TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';

    -- 관리자 가입 시 업체 신규 생성
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        -- 랜덤 4자리 코드 생성
        v_company_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- 업체 생성 (중복 시 업데이트)
        INSERT INTO public.companies (name, code, owner_id)
        VALUES (v_company_name, v_company_code, new.id)
        ON CONFLICT (name, code) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- 팀원 가입 시 업체 찾기 (업체명#코드 형식)
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        IF v_company_name LIKE '%#%' THEN
            SELECT id INTO v_company_id FROM public.companies 
            WHERE name = split_part(v_company_name, '#', 1) 
            AND code = split_part(v_company_name, '#', 2);
        ELSE
            SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name LIMIT 1;
        END IF;
    END IF;

    -- 프로필 생성
    INSERT INTO public.users (id, name, role, company_id, status)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'name', '사용자'), 
        v_role, 
        v_company_id, 
        CASE WHEN v_role = 'admin' THEN 'active' ELSE 'pending' END
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 기존 데이터 보정 (업체 코드가 없는 경우 부여)
UPDATE public.companies SET code = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') WHERE code IS NULL;

NOTIFY pgrst, 'reload config';
