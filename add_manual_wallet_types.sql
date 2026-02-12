-- wallet_logs type 제약조건 업데이트: 'manual_add', 'manual_deduct' 추가
ALTER TABLE public.wallet_logs DROP CONSTRAINT IF EXISTS wallet_logs_type_check;
ALTER TABLE public.wallet_logs ADD CONSTRAINT wallet_logs_type_check
  CHECK (type IN ('earning', 'penalty', 'withdrawal_request', 'withdrawal_paid', 'withdrawal_refund', 'commission', 'manual_add', 'manual_deduct'));
