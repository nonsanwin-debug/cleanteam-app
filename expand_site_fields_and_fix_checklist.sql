-- 1. sites 테이블 필드 확장
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS balance_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_description TEXT,
ADD COLUMN IF NOT EXISTS collection_type TEXT CHECK (collection_type IN ('site', 'company')) DEFAULT 'company';

-- 2. checklist_submissions 상태 기본값 수정 및 기존 데이터 보정
ALTER TABLE public.checklist_submissions 
ALTER COLUMN status SET DEFAULT 'pending';

-- 기존 데이터 중 서명이 없는 데이터는 pending으로 전환 (이미 제출된 것은 유지하고 싶을 수 있으나, 이번 요청의 핵심인 '중간 저장' 오인방지를 위해)
-- 안전하게 signature_url이 없는 경우에만 pending으로 변경
UPDATE public.checklist_submissions 
SET status = 'pending' 
WHERE signature_url IS NULL AND status = 'submitted';
