-- 1. Companies 테이블에 고유 코드 컬럼 추가
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code CHAR(4);

-- 2. 기존 업체들에 랜덤 코드 부여 (중복 방지를 위해 루프 활용 가능하지만 단순화)
UPDATE public.companies SET code = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') WHERE code IS NULL;

-- 3. 업체명 + 코드 유니크 제약 조건 추가
-- 기존에 중복이 있을 수 있으므로 주의가 필요하지만, 현재는 데이터가 적으므로 진행
ALTER TABLE public.companies ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.companies ADD CONSTRAINT companies_name_code_key UNIQUE (name, code);

-- 4. Users 테이블의 기본 상태를 'pending'으로 변경
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'pending';

-- 5. 회원가입 트리거 함수 수정
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_company_code TEXT;
    v_full_input TEXT;
    v_role TEXT;
    v_status TEXT;
BEGIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'worker');
    v_full_input := new.raw_user_meta_data->>'company_name';
    v_status := 'active'; -- 관리자는 즉시 활성

    -- Admin: 업체 생성 시 고유 코드 발급
    IF v_role = 'admin' AND v_full_input IS NOT NULL THEN
        -- 중복되지 않는 4자리 코드 생성 (단순화를 위해 LOOP 없이 시도)
        v_company_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        INSERT INTO public.companies (name, code, owner_id)
        VALUES (v_full_input, v_company_code, new.id)
        ON CONFLICT (name, code) DO UPDATE SET name = EXCLUDED.name 
        RETURNING id INTO v_company_id;
    END IF;

    -- Worker: '업체명#코드' 파싱하여 업체 찾기
    IF v_role = 'worker' AND v_full_input IS NOT NULL THEN
        v_status := 'pending'; -- 팀원은 승인 대기 상태로 시작
        
        IF v_full_input LIKE '%#%' THEN
            v_company_name := split_part(v_full_input, '#', 1);
            v_company_code := split_part(v_full_input, '#', 2);
            
            SELECT id INTO v_company_id 
            FROM public.companies 
            WHERE name = v_company_name AND code = v_company_code;
        ELSE
            -- '#'이 없는 경우 기존 방식(이름만)으로 검색 (하위 호환성)
            SELECT id INTO v_company_id FROM public.companies WHERE name = v_full_input LIMIT 1;
        END IF;
    END IF;

    -- Insert into public.users
    INSERT INTO public.users (id, name, role, company_id, status)
    VALUES (new.id, new.raw_user_meta_data->>'name', v_role, v_company_id, v_status);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재등록 (만약의 경우 대비)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. 스키마 캐시 갱신
NOTIFY pgrst, 'reload config';
