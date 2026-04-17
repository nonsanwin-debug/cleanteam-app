-- shared_orders의 status CHECK 제약조건에 'deleted' 추가
ALTER TABLE shared_orders DROP CONSTRAINT IF EXISTS shared_orders_status_check;
ALTER TABLE shared_orders ADD CONSTRAINT shared_orders_status_check 
  CHECK (status IN ('open', 'accepted', 'transferred', 'completed', 'cancelled', 'deleted'));
