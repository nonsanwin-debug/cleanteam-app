-- ==========================================
-- 1. [진단] 이름이 '김용민'인 계정의 상태 확인
-- ==========================================
SELECT u.id, u.name, u.role, u.company_id, c.name as company_name, c.code
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.name = '김용민';

-- ==========================================
-- 2. [치료] 만약 위 결과에서 company_id가 NULL인 경우, 
-- 해당 유저가 생성한 업체가 있다면 연결해줍니다.
-- ==========================================
UPDATE public.users u
SET company_id = c.id
FROM public.companies c
WHERE u.name = '김용민' 
  AND u.role = 'admin' 
  AND u.company_id IS NULL 
  AND c.owner_id = u.id;

-- ==========================================
-- 3. [확인] 현재 로그인한 관리자의 업체 정보가 올바르게 업데이트되었는지 확인
-- ==========================================
SELECT u.id, u.name, u.role, u.company_id, c.name as company_name, c.code
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.name = '김용민';
