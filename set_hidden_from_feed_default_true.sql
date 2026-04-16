-- 1. 기본값을 true로 변경 (새로 등록되는 현장은 피드에서 숨김 상태로 시작)
ALTER TABLE public.sites ALTER COLUMN hidden_from_feed SET DEFAULT true;

-- 2. 기존에 null인 레코드를 true(숨김)로 통일
UPDATE public.sites SET hidden_from_feed = true WHERE hidden_from_feed IS NULL;
