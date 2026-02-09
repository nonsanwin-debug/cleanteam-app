-- sites 테이블에 작업 시작/종료 시간 기록용 컬럼 추가
ALTER TABLE sites ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
