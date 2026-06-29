-- =============================================
-- shared_orders 테이블 status check 제약조건 업데이트
-- =============================================

-- 1. 기존 check 제약조건 삭제
ALTER TABLE public.shared_orders DROP CONSTRAINT IF EXISTS shared_orders_status_check;

-- 2. 신규 상태값('reclaim_requested', 'completed', 'deleted')이 포함된 제약조건 재등록
ALTER TABLE public.shared_orders ADD CONSTRAINT shared_orders_status_check CHECK (
    status IN ('open', 'accepted', 'transferred', 'cancelled', 'deleted_by_receiver', 'reclaim_requested', 'completed', 'deleted')
);
