-- 파트너 피드에서 현장 숨기기 위한 컬럼 추가
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS hidden_from_feed boolean DEFAULT false;
