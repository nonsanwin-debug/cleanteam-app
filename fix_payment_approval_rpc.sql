-- 출금 승인/지급 완료 처리 함수 (보안 옵션 포함)
CREATE OR REPLACE FUNCTION approve_payment_admin(
  p_request_id UUID,
  p_admin_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_current_status TEXT;
  v_current_balance INTEGER;
BEGIN
  -- 1. 요청 정보 조회 (FOR UPDATE로 잠금)
  SELECT user_id, amount, status 
  INTO v_user_id, v_amount, v_current_status
  FROM payment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- 2. 검증
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '요청을 찾을 수 없습니다.');
  END IF;

  IF v_current_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 지급 완료된 요청입니다.');
  END IF;

  IF v_current_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', '처리할 수 없는 상태입니다: ' || v_current_status);
  END IF;

  -- 3. 사용자 잔액 조회
  SELECT current_money INTO v_current_balance
  FROM users
  WHERE id = v_user_id;

  IF v_current_balance < v_amount THEN
    RETURN jsonb_build_object('success', false, 'error', '사용자 잔액이 부족합니다.');
  END IF;

  -- 4. 업데이트 (트랜잭션)
  -- 상태 변경
  UPDATE payment_requests 
  SET 
    status = 'completed',
    completed_at = NOW(),
    approved_by = p_admin_id
  WHERE id = p_request_id;

  -- 잔액 차감
  UPDATE users
  SET current_money = current_money - v_amount
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여 (필요시)
GRANT EXECUTE ON FUNCTION approve_payment_admin TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payment_admin TO service_role;
