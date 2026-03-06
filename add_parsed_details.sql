-- shared_orders 테이블에 AI 파싱 결과를 저장할 컬럼 추가
ALTER TABLE shared_orders 
ADD COLUMN IF NOT EXISTS parsed_details jsonb;
