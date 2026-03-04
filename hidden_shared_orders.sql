-- =============================================
-- 오더 공유 수신업체 삭제(숨기기) 기능
-- 수신 업체가 삭제한 오더를 기록하여 해당 업체에게만 안 보이게 처리함
-- 발신 업체나 다른 수신 업체에게는 계속 보이도록 유지
-- =============================================

CREATE TABLE IF NOT EXISTS hidden_shared_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
    hidden_at timestamptz DEFAULT now(),
    UNIQUE(company_id, order_id)
);

-- RLS 활성화
ALTER TABLE hidden_shared_orders ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자가 자신의 회사 ID를 기반으로 읽고 쓸 수 있도록 허용 (서버 액션에서는 service role을 주로 사용)
DROP POLICY IF EXISTS "hidden_shared_orders_all" ON hidden_shared_orders;
CREATE POLICY "hidden_shared_orders_all" ON hidden_shared_orders
    FOR ALL TO authenticated
    USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_hidden_company ON hidden_shared_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_hidden_order ON hidden_shared_orders(order_id);
