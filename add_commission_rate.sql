-- 팀장별 추가금 퍼센티지 설정 컬럼 추가
-- commission_rate: 0~100 (퍼센트), 기본값 100%
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_rate INTEGER DEFAULT 100;
