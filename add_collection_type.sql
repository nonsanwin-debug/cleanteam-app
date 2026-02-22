-- shared_orders 테이블에 collection_type 컬럼 추가
ALTER TABLE shared_orders ADD COLUMN IF NOT EXISTS collection_type text DEFAULT NULL
    CHECK (collection_type IN ('site', 'company'));
