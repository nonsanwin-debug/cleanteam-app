-- 1. 'shared_orders' 테이블에 'is_auto_assign' 컬럼 추가 (AI 배정 여부 저장)
ALTER TABLE public.shared_orders ADD COLUMN IF NOT EXISTS is_auto_assign BOOLEAN DEFAULT false;
