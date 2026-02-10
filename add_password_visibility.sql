-- users 테이블에 초기 비밀번호 저장용 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS initial_password TEXT;

-- 주석 추가
COMMENT ON COLUMN public.users.initial_password IS '관리자가 설정한 초기 비밀번호 (확인용)';
