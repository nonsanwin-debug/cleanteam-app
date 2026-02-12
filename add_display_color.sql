-- 팀장별 고유 텍스트 색상 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_color TEXT DEFAULT NULL;

-- 확인
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'display_color';
