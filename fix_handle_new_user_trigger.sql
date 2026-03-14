-- 1. 회원가입 트리거 함수 (모든 예외 상황을 고려한 Bulletproof 버전)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_company_code TEXT;
    v_role TEXT;
BEGIN
    -- 메타데이터 파싱
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_company_name := new.raw_user_meta_data->>'company_name';

    -- 1. 업체 처리 (관리자일 경우)
    IF v_role = 'admin' AND v_company_name IS NOT NULL THEN
        -- 랜덤 코드 발급 (기존 데이터가 없을 때만)
        v_company_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- 업체 생성 또는 기존 업체 ID 가져오기 (충돌 방지)
        -- FIXED: Added company_code and status
        INSERT INTO public.companies (name, code, company_code, owner_id, status)
        VALUES (v_company_name, v_company_code, v_company_code, new.id, 'pending')
        ON CONFLICT (name, code) DO UPDATE SET owner_id = EXCLUDED.owner_id
        RETURNING id INTO v_company_id;
    END IF;

    -- 2. 업체 처리 (팀원일 경우 - 업체 찾기)
    IF v_role = 'worker' AND v_company_name IS NOT NULL THEN
        IF v_company_name LIKE '%#%' THEN
            SELECT id INTO v_company_id FROM public.companies 
            WHERE name = split_part(v_company_name, '#', 1) 
            AND code = split_part(v_company_name, '#', 2)
            LIMIT 1;
        ELSE
            SELECT id INTO v_company_id FROM public.companies 
            WHERE name = v_company_name 
            LIMIT 1;
        END IF;
    END IF;

    -- 3. 유저 프로필 생성 (이미 존재할 경우 업데이트 - 매우 중요)
    INSERT INTO public.users (
        id, 
        name, 
        phone, 
        role, 
        company_id, 
        status, 
        email
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'name', '관리자'), 
        new.raw_user_meta_data->>'phone',
        v_role,
        v_company_id,
        CASE WHEN v_role = 'admin' THEN 'active' ELSE 'pending' END,
        new.email
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        company_id = EXCLUDED.company_id,
        status = EXCLUDED.status,
        email = EXCLUDED.email;
    
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- 트리거 실패 시 로그를 남길 수는 없지만, 에러 발생 시 auth 가입 자체가 취소됨을 인지
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new; -- 최대한 가입은 성공시키기 위해 return new
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
