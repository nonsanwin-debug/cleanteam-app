-- =============================================
-- shared_orders 테이블의 work_date NOT NULL 제약조건 제거
-- (날짜를 지정하지 않고 통으로 오더를 올릴 수 있게 하기 위함)
-- =============================================

ALTER TABLE shared_orders ALTER COLUMN work_date DROP NOT NULL;
