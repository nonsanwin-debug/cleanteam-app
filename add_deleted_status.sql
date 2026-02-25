-- =============================================
-- shared_orders status에 'deleted_by_receiver' 추가
-- 수신 업체가 오더를 삭제할 때 발신 업체에 알림
-- =============================================

-- 기존 CHECK 제약 조건 삭제 후 재생성
ALTER TABLE shared_orders DROP CONSTRAINT IF EXISTS shared_orders_status_check;
ALTER TABLE shared_orders ADD CONSTRAINT shared_orders_status_check 
  CHECK (status IN ('open', 'accepted', 'transferred', 'cancelled', 'deleted_by_receiver'));
