-- ==========================================
-- 모든 관리자 계정의 누락된 업체 연결 복구
-- ==========================================

-- 아래 쿼리를 Supabase SQL Editor에서 실행해주세요.

-- 1. [치료] 현재 company_id가 없는 모든 'admin' 계정 찾아서,
-- 자신이 만든 업체(owner_id = u.id)와 자동 연결
UPDATE public.users u
SET company_id = c.id
FROM public.companies c
WHERE u.role = 'admin' 
  AND u.company_id IS NULL 
  AND c.owner_id = u.id;

-- 2. [확인] 제대로 연결되었는지 전체 관리자 조회
SELECT u.name, u.role, c.name as company_name, c.code
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'admin'
ORDER BY u.created_at DESC;
