-- 1. applicants 테이블에 상태 및 업데이트 시간 컬럼 추가
ALTER TABLE shared_order_applicants 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'applied';

ALTER TABLE shared_order_applicants 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. updated_at 자동 갱신 트리거 설정 (옵션이지만 권장됨)
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shared_order_applicants_updated_at ON shared_order_applicants;

CREATE TRIGGER trg_shared_order_applicants_updated_at
BEFORE UPDATE ON shared_order_applicants
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_column();
