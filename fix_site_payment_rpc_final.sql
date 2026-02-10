-- 1. 현장 청구 지급 완료 처리 함수 (Site-based Payment)
-- 관리자 페이지의 "지급 대기 (청구)" 탭에서 [지급] 버튼 클릭 시 사용됩니다.
CREATE OR REPLACE FUNCTION approve_payment_admin(
  site_id_param UUID,
  user_id_param UUID,
  amount_param INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- 1. 현장 정보 및 상태 확인 (Locking)
  SELECT payment_status INTO v_current_status
  FROM public.sites
  WHERE id = site_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '현장 정보를 찾을 수 없습니다.');
  END IF;

  IF v_current_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 지급 완료 처리된 현장입니다.');
  END IF;

  -- 2. 현장 결제 상태 업데이트
  UPDATE public.sites
  SET 
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = site_id_param;

  -- 3. 사용자 지갑 잔액 차감 (이미 청구 시점에 합산되었다고 가정하거나, 포인트 개념일 경우 합산)
  -- 현재 비즈니스 로직상 청구 승인 시 사용자의 current_money를 '차감'하는 것이 아니라 '지급'하는 것이라면 아래처럼 처리:
  UPDATE public.users
  SET current_money = COALESCE(current_money, 0) + amount_param
  WHERE id = user_id_param;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 권한 부여
GRANT EXECUTE ON FUNCTION approve_payment_admin(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payment_admin(UUID, UUID, INTEGER) TO service_role;

-- 3. 캐시 로드
NOTIFY pgrst, 'reload config';
