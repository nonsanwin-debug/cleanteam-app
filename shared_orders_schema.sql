-- =============================================
-- 오더 공유 시스템 DB 스키마 (재실행 가능)
-- =============================================

-- 1. companies 테이블에 sharing_enabled 컬럼 추가 (code 컬럼은 이미 존재)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sharing_enabled boolean DEFAULT false;

-- 2. shared_orders 테이블 생성
CREATE TABLE IF NOT EXISTS shared_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    region text NOT NULL,
    work_date date NOT NULL,
    area_size text NOT NULL,
    notes text,
    address text,
    customer_phone text,
    customer_name text,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'transferred', 'cancelled')),
    accepted_by uuid REFERENCES companies(id),
    accepted_at timestamptz,
    transferred_site_id uuid REFERENCES sites(id),
    created_at timestamptz DEFAULT now()
);

-- 3. shared_order_notifications 테이블 생성
CREATE TABLE IF NOT EXISTS shared_order_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES shared_orders(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES companies(id),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 4. RLS 활성화
ALTER TABLE shared_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_order_notifications ENABLE ROW LEVEL SECURITY;

-- 5. shared_orders RLS 정책 (기존 정책 삭제 후 재생성)
DROP POLICY IF EXISTS "shared_orders_own_company" ON shared_orders;
DROP POLICY IF EXISTS "shared_orders_view_open" ON shared_orders;
DROP POLICY IF EXISTS "shared_orders_insert" ON shared_orders;
DROP POLICY IF EXISTS "shared_orders_update" ON shared_orders;

CREATE POLICY "shared_orders_own_company" ON shared_orders
    FOR ALL TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        OR accepted_by IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "shared_orders_view_open" ON shared_orders
    FOR SELECT TO authenticated
    USING (
        status = 'open'
        AND (SELECT company_id FROM users WHERE id = auth.uid()) IN (
            SELECT id FROM companies WHERE sharing_enabled = true
        )
    );

CREATE POLICY "shared_orders_insert" ON shared_orders
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "shared_orders_update" ON shared_orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. shared_order_notifications RLS 정책 (기존 정책 삭제 후 재생성)
DROP POLICY IF EXISTS "notifications_own_company" ON shared_order_notifications;
DROP POLICY IF EXISTS "notifications_insert" ON shared_order_notifications;

CREATE POLICY "notifications_own_company" ON shared_order_notifications
    FOR ALL TO authenticated
    USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "notifications_insert" ON shared_order_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 7. 인덱스
CREATE INDEX IF NOT EXISTS idx_shared_orders_status ON shared_orders(status);
CREATE INDEX IF NOT EXISTS idx_shared_orders_company ON shared_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_shared_orders_accepted_by ON shared_orders(accepted_by);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON shared_order_notifications(company_id, is_read);
