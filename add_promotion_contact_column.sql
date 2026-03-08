-- 홍보 페이지용 연락처 컬럼 추가
ALTER TABLE companies ADD COLUMN IF NOT EXISTS promotion_contact_number text;
