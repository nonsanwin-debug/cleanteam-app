-- [최종-긴급수정] updated_at 제거 버전
-- sites 테이블에 updated_at 컬럼이 없어도 작동하도록 수정함

-- 1. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION start_work(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION start_work(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION complete_work(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_work(UUID) TO service_role;

-- 2. 작업 시작 함수 (updated_at 제거)
CREATE OR REPLACE FUNCTION start_work(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_user_role TEXT;
  v_current_uid UUID;
BEGIN
  v_current_uid := auth.uid();
  
  SELECT role INTO v_user_role FROM users WHERE id = v_current_uid;
  SELECT worker_id INTO v_worker_id FROM sites WHERE id = p_site_id;

  IF v_worker_id IS NULL THEN
     RAISE EXCEPTION '해당 현장에 할당된 담당자가 없습니다. (Site ID: %, Worker ID is NULL)', p_site_id;
  END IF;

  IF v_worker_id = v_current_uid OR v_user_role = 'admin' THEN
    UPDATE sites
    SET 
      status = 'in_progress',
      started_at = NOW()
      -- updated_at 컬럼이 없을 수 있으므로 제외
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '권한 거부: 본인 현장이 아닙니다. (My ID: %, Site Worker ID: %)', v_current_uid, v_worker_id;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 작업 완료 함수 (updated_at 제거)
CREATE OR REPLACE FUNCTION complete_work(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_user_role TEXT;
  v_current_uid UUID;
BEGIN
  v_current_uid := auth.uid();
  
  SELECT role INTO v_user_role FROM users WHERE id = v_current_uid;
  SELECT worker_id INTO v_worker_id FROM sites WHERE id = p_site_id;

  IF v_worker_id = v_current_uid OR v_user_role = 'admin' THEN
    UPDATE sites
    SET 
      status = 'completed',
      completed_at = NOW()
      -- updated_at 컬럼이 없을 수 있으므로 제외
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '권한 거부: 본인 현장이 아닙니다.';
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
