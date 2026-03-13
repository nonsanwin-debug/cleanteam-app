-- =====================================================================
-- [최종 보스용] 업체 파괴 현상 복구 (업체 테이블에 아예 없는 경우)
-- =====================================================================

-- 1. [진단] 가입할 때 썼던 '원래 업체명' 확인
-- (에러 기간 동안 가입해서 업체가 증발한 관리자 목록)
SELECT 
    u.name AS admin_name,
    au.raw_user_meta_data->>'company_name' AS original_company_name
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.role = 'admin' AND u.company_id IS NULL;

-- 2. [치료] 증발한 업체를 다시 생성하고 연결해줍니다.
DO $$ 
DECLARE
    r RECORD;
    v_company_id UUID;
    v_company_code TEXT;
BEGIN
    FOR r IN 
        SELECT 
            u.id AS user_id, 
            au.raw_user_meta_data->>'company_name' AS c_name
        FROM public.users u
        JOIN auth.users au ON u.id = au.id
        WHERE u.role = 'admin' AND u.company_id IS NULL
    LOOP
        IF r.c_name IS NOT NULL THEN
            -- 랜덤 4자리 코드 생성 (0000~9999)
            v_company_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
            
            -- 업체 생성 (이미 동일한 업체명이 있으면 해당 ID 가져오기)
            INSERT INTO public.companies (name, code, company_code, owner_id)
            VALUES (r.c_name, v_company_code, v_company_code, r.user_id)
            ON CONFLICT (name, code) DO UPDATE SET owner_id = EXCLUDED.owner_id
            RETURNING id INTO v_company_id;
            
            -- 만약 유니크 키 충돌(name만 같은 경우)로 INSERT가 안된 경우 SELECT로 찾기
            IF v_company_id IS NULL THEN
                 SELECT id INTO v_company_id FROM public.companies WHERE name = r.c_name LIMIT 1;
            END IF;

            -- 유저 테이블에 방금 생성/찾은 업체 연결
            UPDATE public.users 
            SET company_id = v_company_id 
            WHERE id = r.user_id;
        END IF;
    END LOOP;
END $$;

-- 3. [최종 확인] 복구된 분들의 업체와 코드 확인
SELECT 
    u.name AS "이름", 
    u.role AS "역할", 
    c.name AS "업체명", 
    c.code AS "코드"
FROM public.users u
JOIN public.companies c ON u.company_id = c.id
WHERE u.name IN ('최성광', '김용민', '김태휘') OR u.role = 'admin'
ORDER BY u.created_at;
