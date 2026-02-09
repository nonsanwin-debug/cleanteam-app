-- [긴급 수정] updated_at 갱신 추가
-- 이유: updated_at이 갱신되지 않으면 대시보드 "최신 활동" 정렬에서 밀려나서 안 보임

-- 1. 작업 시작 함수 (updated_at 추가)
CREATE OR REPLACE FUNCTION start_work(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();
  SELECT worker_id INTO v_worker_id FROM sites WHERE id = p_site_id;

  IF v_worker_id = auth.uid() OR v_user_role = 'admin' THEN
    UPDATE sites
    SET 
      status = 'in_progress',
      started_at = NOW(),
      updated_at = NOW() -- 정렬을 위해 필수!
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '권한이 없습니다.';
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 작업 완료 함수 (updated_at 추가)
CREATE OR REPLACE FUNCTION complete_work(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();
  SELECT worker_id INTO v_worker_id FROM sites WHERE id = p_site_id;

  IF v_worker_id = auth.uid() OR v_user_role = 'admin' THEN
    UPDATE sites
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW() -- 정렬을 위해 필수!
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '권한이 없습니다.';
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
