-- 모든 데이터 초기화 (신규 시작용)
-- 주의: 이 스크립트는 모든 현장, 사진, 청구 내역을 삭제합니다.

-- 1. 하위 테이블부터 삭제
TRUNCATE TABLE public.checklist_submissions CASCADE;
TRUNCATE TABLE public.photos CASCADE;
TRUNCATE TABLE public.withdrawal_requests CASCADE;
TRUNCATE TABLE public.as_requests CASCADE;

-- 2. 메인 테이블 삭제
TRUNCATE TABLE public.sites CASCADE;

-- 3. 유저 테이블 (선택사항)
-- 만약 업체 관리자 계정까지 새로 가입하시려면 아래 주석을 해제하고 실행하세요.
-- TRUNCATE TABLE public.users CASCADE;
-- TRUNCATE TABLE public.companies CASCADE;

-- 참고: Supabase Auth 유저는 대시보드(Authentication > Users)에서 직접 삭제하셔야 합니다.
