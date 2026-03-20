-- 1. 기존 users_role_check 제약 조건 삭제
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. 'partner' 역할을 포함하여 새로운 제약 조건 추가
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('worker', 'admin', 'master', 'partner', 'banned'));
