-- 개발 환경용: 모든 사용자를 관리자(admin)로 변경
-- 주의: 배포 환경에서는 절대 사용하지 마세요.

UPDATE public.users
SET role = 'admin';

-- 변경 결과 확인
SELECT * FROM public.users;
