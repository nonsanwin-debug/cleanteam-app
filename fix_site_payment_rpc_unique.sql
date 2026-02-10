-- 기존에 있을 수 있는 중복 함수들 삭제 (충돌 방지)
DROP FUNCTION IF EXISTS approve_payment_admin(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS approve_payment_admin(UUID, UUID);

-- 1. 새로운 고유 이름의 지급 처리 함수 생성
-- 이름을 중복되지 않게 approve_site_payment_final_v1 로 설정합니다.
CREATE OR REPLACE FUNCTION approve_site_payment_final_v1(
  p_site_id UUID,
  p_user_id UUID,
  p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_exists BOOLEAN;
BEGIN
  -- 1. 현장 존재 여부 및 상태 확인
  SELECT payment_status, (id IS NOT NULL)
  INTO v_current_status, v_exists
  FROM public.sites
  WHERE id = p_site_id
  FOR UPDATE;

  IF v_exists IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', '현장 정보를 찾을 수 없습니다. (ID: ' || p_site_id || ')');
  END IF;

  IF v_current_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 지급 완료 처리된 현장입니다.');
  END IF;

  -- 2. 현장 결제 상태 업데이트
  UPDATE public.sites
  SET 
    payment_status = 'paid',
    updated_at = NOW()
  WHERE id = p_site_id;

  -- 3. 사용자 지갑 잔액 지급
  UPDATE public.users
  SET current_money = COALESCE(current_money, 0) + p_amount
  WHERE id = p_user_id;

  IF NOT FOUND THEN
     RETURN jsonb_build_object('success', false, 'error', '사용자 정보를 업데이트할 수 없습니다. (ID: ' || p_user_id || ')');
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'DB 에러: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 권한 부여
GRANT EXECUTE ON FUNCTION approve_site_payment_final_v1(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_site_payment_final_v1(UUID, UUID, INTEGER) TO service_role;

-- 3. 캐시 로드
NOTIFY pgrst, 'reload config';
