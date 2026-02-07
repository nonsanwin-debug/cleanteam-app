-- ========================================
-- 사용자 삭제 문제 해결 SQL
-- ========================================
-- 사용자를 삭제하려고 할 때 "Foreign Key Constraint Violation" 에러가 발생하는 이유는
-- 해당 사용자가 'sites'나 'checklist_submissions' 테이블에서 참조되고 있기 때문입니다.
-- 이 스크립트는 참조된 데이터가 있어도 사용자를 삭제할 수 있도록 제약 조건을 수정합니다.

-- 1. sites 테이블의 worker_id 제약 조건 수정
-- 작업자가 삭제되면, 현장의 담당자(worker_id)를 NULL(비어있음)로 변경
ALTER TABLE public.sites 
DROP CONSTRAINT IF EXISTS sites_worker_id_fkey;

ALTER TABLE public.sites
ADD CONSTRAINT sites_worker_id_fkey 
FOREIGN KEY (worker_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- 2. checklist_submissions 테이블의 worker_id 제약 조건 수정
-- 작업자가 삭제되면, 제출 기록의 작성자 정보도 NULL로 변경 (기록은 유지)
ALTER TABLE public.checklist_submissions 
DROP CONSTRAINT IF EXISTS checklist_submissions_worker_id_fkey;

ALTER TABLE public.checklist_submissions
ADD CONSTRAINT checklist_submissions_worker_id_fkey 
FOREIGN KEY (worker_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- 3. (선택사항) 모든 테스트 사용자 및 관련 데이터 강제 삭제
-- 주의: 모든 데이터를 초기화하고 싶을 때만 주석을 해제하고 실행하세요.
/*
TRUNCATE TABLE public.checklist_submissions CASCADE;
TRUNCATE TABLE public.photos CASCADE;
TRUNCATE TABLE public.sites CASCADE;
DELETE FROM auth.users WHERE email LIKE '%@cleanteam.app';
*/
