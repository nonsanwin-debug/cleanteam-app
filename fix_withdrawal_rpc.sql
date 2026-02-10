-- 출금 요청 처리(지급 완료/반려) 함수 (보안 옵션 포함)
CREATE OR REPLACE FUNCTION process_withdrawal_admin(
  p_request_id UUID,
  p_status TEXT, -- 'paid' 또는 'rejected'
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- 1. 요청 조회 (FOR UPDATE)
  SELECT * INTO v_request 
  FROM withdrawal_requests 
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '요청을 찾을 수 없습니다.');
  END IF;

  -- 이미 처리된 경우 체크 (중복 실행 방지)
  IF v_request.status = p_status THEN
     -- 이미 같은 상태라면 성공으로 간주
     RETURN jsonb_build_object('success', true, 'message', '이미 처리된 요청입니다.');
  END IF;

  -- 2. 상태 처리
  IF p_status = 'paid' THEN
    UPDATE withdrawal_requests 
    SET status = 'paid', updated_at = NOW() 
    WHERE id = p_request_id;

  ELSIF p_status = 'rejected' THEN
    -- 반려 시 환불 처리가 안 되어 있다면 환불 진행
    -- (단, 이전 상태가 pending일 때만 환불해야 함. 이미 paid였다면 환불 불가, rejected였다면 중복 환불 불가)
    IF v_request.status = 'pending' THEN
        UPDATE withdrawal_requests 
        SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW() 
        WHERE id = p_request_id;
        
        -- 환불 로직: 사용자 잔액 복구
        UPDATE users 
        SET current_money = COALESCE(current_money, 0) + v_request.amount 
        WHERE id = v_request.user_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', '대기 중인 요청만 반려할 수 있습니다.');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION process_withdrawal_admin TO authenticated;
GRANT EXECUTE ON FUNCTION process_withdrawal_admin TO service_role;
