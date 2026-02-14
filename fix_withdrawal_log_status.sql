-- =====================================================
-- 출금 요청 처리 시 로그 상태 업데이트 수정
-- =====================================================

-- 1. wallet_logs 테이블의 type CHECK 제약 조건 업데이트 (commission, manual_add, manual_deduct 추가)
ALTER TABLE public.wallet_logs DROP CONSTRAINT IF EXISTS wallet_logs_type_check;
ALTER TABLE public.wallet_logs ADD CONSTRAINT wallet_logs_type_check 
    CHECK (type IN ('earning', 'commission', 'penalty', 'withdrawal_request', 'withdrawal_paid', 'withdrawal_refund', 'manual_add', 'manual_deduct', 'withdrawal'));

-- 2. RPC 수정: process_withdrawal_admin - 새 로그 INSERT 대신 기존 로그 UPDATE
CREATE OR REPLACE FUNCTION process_withdrawal_admin(
  p_request_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_new_balance INTEGER;
  v_company_id UUID;
BEGIN
  SELECT r.*, u.company_id INTO v_request 
  FROM withdrawal_requests r JOIN users u ON r.user_id = u.id
  WHERE r.id = p_request_id FOR UPDATE;
  
  IF v_request.status = p_status THEN
     RETURN jsonb_build_object('success', true, 'message', '이미 처리되었습니다.');
  END IF;

  IF p_status = 'paid' THEN
    UPDATE withdrawal_requests SET status = 'paid', updated_at = NOW() WHERE id = p_request_id;
    
    -- 기존 withdrawal_request 로그를 withdrawal_paid로 업데이트
    SELECT current_money INTO v_new_balance FROM users WHERE id = v_request.user_id;
    UPDATE wallet_logs 
    SET type = 'withdrawal_paid', 
        description = '출금 지급완료',
        balance_after = v_new_balance
    WHERE reference_id = p_request_id AND type = 'withdrawal_request';

  ELSIF p_status = 'rejected' THEN
    IF v_request.status = 'pending' THEN
        UPDATE withdrawal_requests SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW() WHERE id = p_request_id;
        
        -- 환불 처리
        UPDATE users SET current_money = COALESCE(current_money, 0) + v_request.amount WHERE id = v_request.user_id
        RETURNING current_money INTO v_new_balance;

        -- 기존 withdrawal_request 로그를 withdrawal_refund로 업데이트
        UPDATE wallet_logs 
        SET type = 'withdrawal_refund', 
            amount = v_request.amount,
            balance_after = v_new_balance,
            description = '출금 반려 (환불 완료): ' || COALESCE(p_reason, '사유 없음')
        WHERE reference_id = p_request_id AND type = 'withdrawal_request';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', '대기 중인 요청만 처리 가능합니다.');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. 기존에 이미 처리된 출금 건의 로그 수정 (이미 paid인데 withdrawal_request로 남아있는 것들)
-- 이미 처리된 출금 요청의 wallet_log를 일괄 업데이트
UPDATE wallet_logs wl
SET type = 'withdrawal_paid',
    description = '출금 지급완료'
FROM withdrawal_requests wr
WHERE wl.reference_id = wr.id
  AND wl.type = 'withdrawal_request'
  AND wr.status = 'paid';

-- 이미 반려된 출금 요청의 wallet_log도 수정
UPDATE wallet_logs wl
SET type = 'withdrawal_refund',
    description = '출금 반려 (환불 완료)'
FROM withdrawal_requests wr
WHERE wl.reference_id = wr.id
  AND wl.type = 'withdrawal_request'
  AND wr.status = 'rejected';

-- 4. 중복으로 생성된 withdrawal_paid 로그 정리 (RPC에서 INSERT된 것)
-- 기존 withdrawal_request가 withdrawal_paid로 업데이트되었으므로,
-- RPC에서 별도로 INSERT된 withdrawal_paid (amount=0) 로그 제거
DELETE FROM wallet_logs 
WHERE type = 'withdrawal_paid' AND amount = 0;

-- 5. admin.ts에서 INSERT된 type='withdrawal' 로그도 정리
DELETE FROM wallet_logs 
WHERE type = 'withdrawal';
