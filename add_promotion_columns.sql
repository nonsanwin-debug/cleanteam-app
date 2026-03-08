-- 1. companies 테이블에 홍보페이지 활성화 여부 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS promotion_page_enabled boolean DEFAULT false;

-- 2. sites 테이블에 홍보페이지 노출 제외 여부 추가
ALTER TABLE sites ADD COLUMN IF NOT EXISTS hidden_from_promotion boolean DEFAULT false;
