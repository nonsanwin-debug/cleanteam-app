-- 해피콜 기능 추가 시 누락되었던 컬럼을 생성합니다.
-- 이 컬럼이 없어서 현재 워커페이지 일정이 보이지 않는 현상이 발생했습니다.

ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS happy_call_completed boolean DEFAULT false;
