-- sites 테이블에 누락된 타임스탬프 컬럼 추가
ALTER TABLE sites ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 기존 레코드의 updated_at을 현재 시간으로 초기화 (Null 방지)
UPDATE sites SET updated_at = NOW() WHERE updated_at IS NULL;
