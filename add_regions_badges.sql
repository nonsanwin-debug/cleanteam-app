-- 1. companies 테이블에 컬럼 추가 (도, 시, 각종 뱃지 및 노출/전국 권한 상태)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS region_province TEXT,
ADD COLUMN IF NOT EXISTS region_city TEXT,
ADD COLUMN IF NOT EXISTS is_national BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_business BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_excellent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_aftercare BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expose_partner_orders BOOLEAN DEFAULT true;


-- 2. 기존 공유 오더 관련 RLS 업데이트
-- 기존 "shared_orders_view_open" 정책 삭제 후 재생성
DROP POLICY IF EXISTS "shared_orders_view_open" ON shared_orders;

-- 오더가 'open'인 상태이고 조회하는 회원의 sharing_enabled가 true일 때,
-- 전국 권한(is_national)이 있거나, 오더의 region(도)과 회사의 region_province가 일치하면 보이도록 처리.
CREATE POLICY "shared_orders_view_open" ON shared_orders
    FOR SELECT TO authenticated
    USING (
        status = 'open'
        AND EXISTS (
             SELECT 1 FROM companies 
             WHERE companies.id = (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1)
             AND companies.sharing_enabled = true
             AND (
                 companies.is_national = true 
                 OR companies.region_province = shared_orders.region
             )
        )
        -- 노출하지 않기로 한 파트너의 오더도 제외하려면 오더 작성자의 expose_partner_orders가 true여야 함
        AND EXISTS (
             SELECT 1 FROM companies creator_comp
             WHERE creator_comp.id = shared_orders.company_id
             AND creator_comp.expose_partner_orders = true
        )
    );
