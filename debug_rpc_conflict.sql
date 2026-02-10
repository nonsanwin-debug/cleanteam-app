-- 1. approve_payment_admin 이라는 이름을 가진 모든 함수와 그 파라미터 확인
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.prosecdef as is_security_definer,
    n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'approve_payment_admin';

-- 2. sites 테이블의 실제 컬럼 타입 및 제약 조건 확인
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sites' AND table_schema = 'public';

-- 3. 특정 현장의 상태 확인 (스크린샷의 '엘리프' 현장 위주)
SELECT id, name, payment_status, claimed_amount, worker_id
FROM public.sites
WHERE name LIKE '%엘리프%'
LIMIT 5;
