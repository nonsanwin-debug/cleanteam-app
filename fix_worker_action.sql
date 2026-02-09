-- [긴급] 작업 상태 변경 함수 생성 (RLS 우회)

-- 1. 혹시 누락되었을 수 있는 컬럼 다시 추가 시도 (안전 장치)
ALTER TABLE sites ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. 작업 시작 함수 (SECURITY DEFINER로 권한 우회)
CREATE OR REPLACE FUNCTION start_work(p_site_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_worker_id UUID;
  v_user_role TEXT;
BEGIN
  -- 현재 유저의 역할 확인
  SELECT role INTO v_user_role FROM users WHERE id = auth.uid();

  -- 해당 사이트의 담당자 확인
  SELECT worker_id INTO v_worker_id FROM sites WHERE id = p_site_id;

  -- 권한 체크: 담당 팀장이거나 관지자(admin)여야 함
  IF v_worker_id = auth.uid() OR v_user_role = 'admin' THEN
    UPDATE sites
    SET 
      status = 'in_progress',
      started_at = NOW() -- 현재 시간 기록
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '이 작업을 시작할 권한이 없습니다.';
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 작업 완료 함수
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
      completed_at = NOW() -- 완료 시간 기록
    WHERE id = p_site_id;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION '이 작업을 완료할 권한이 없습니다.';
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
