-- 1. users 테이블 누락 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'member',
ADD COLUMN IF NOT EXISTS account_info TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS current_money INTEGER DEFAULT 0;

-- 2. 새 사용자 처리 트리거 함수 강화 (회원가입 시 더 많은 필드를 동기화)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';
    
    -- Admin: 업체 정보 생성 또는 조회
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name, owner_id)
        VALUES (v_company_name, new.id)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- Worker: 업체 정보 조회
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        SELECT id INTO v_company_id FROM public.companies WHERE name = v_company_name;
    END IF;

    -- public.users 데이터 삽입 (metadata에서 더 많은 정보를 가져옴)
    INSERT INTO public.users (
        id, 
        name, 
        phone, 
        email, 
        role, 
        company_id, 
        status, 
        worker_type
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'name', '사용자'), 
        new.raw_user_meta_data->>'phone', 
        new.email, -- auth.users의 실제 이메일 사용
        v_role, 
        v_company_id, 
        'active',
        'member'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        company_id = EXCLUDED.company_id;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 캐시 갱신 (선택사항이나 안전을 위해)
NOTIFY pgrst, 'reload schema';
