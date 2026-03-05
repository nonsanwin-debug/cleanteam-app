-- =============================================
-- 공유 오더 다중 수락 (지원자) 시스템
-- 여러 업체가 하나의 오더에 상세정보 요청(지원)을 할 수 있도록 관리하는 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS shared_order_applicants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(order_id, company_id)
);

-- RLS 활성화
ALTER TABLE shared_order_applicants ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자가 접근 가능 (서버 사이드에서 로직 처리)
DROP POLICY IF EXISTS "shared_order_applicants_all" ON shared_order_applicants;
CREATE POLICY "shared_order_applicants_all" ON shared_order_applicants
    FOR ALL TO authenticated
    USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_applicants_order ON shared_order_applicants(order_id);
CREATE INDEX IF NOT EXISTS idx_applicants_company ON shared_order_applicants(company_id);
