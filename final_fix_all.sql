-- ==========================================
-- [중요] 이 스크립트는 기존 정책을 초기화하고
-- 관리자와 팀장이 올바르게 작동하도록 재설정합니다.
-- Supabase SQL Editor에서 실행해주세요.
-- ==========================================

-- 1. users 테이블 권한 설정
-- 관리자인지 확인하는 함수 생성 (무한 재귀 호출 방지)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users via function" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- 새 정책 적용
-- 관리자는 모든 사용자 보기 가능
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
USING (is_admin());

-- 사용자(팀장 포함)는 자기 자신 보기 가능
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- (선택) 팀장 목록 조회를 위해 'worker' 역할인 사용자는 누구나 볼 수 있게 허용
-- 관리자가 아닌 일반 유저가 팀장을 조회해야 할 일이 있다면 아래 주석 해제
-- CREATE POLICY "Everyone can view workers"
-- ON users FOR SELECT
-- USING (role = 'worker');


-- 2. sites 테이블 권한 설정
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can do everything on sites" ON sites;
DROP POLICY IF EXISTS "Workers can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Workers can update status of assigned sites" ON sites;

-- 관리자: 모든 권한 (조회, 생성, 수정, 삭제)
CREATE POLICY "Admins can do everything on sites"
ON sites FOR ALL
USING (is_admin());

-- 팀장: 자신에게 할당된 현장만 조회
CREATE POLICY "Workers can view assigned sites"
ON sites FOR SELECT
USING (auth.uid() = worker_id);

-- 팀장: 현장 상태 변경 등 업데이트 허용
CREATE POLICY "Workers can update status of assigned sites"
ON sites FOR UPDATE
USING (auth.uid() = worker_id);


-- 3. checklist_templates 테이블 (관리자 전용)
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage templates" ON checklist_templates;
DROP POLICY IF EXISTS "Everyone can view templates" ON checklist_templates;

-- 관리자 관리 권한
CREATE POLICY "Admins manage templates"
ON checklist_templates FOR ALL
USING (is_admin());

-- 팀장 조회 권한 (체크리스트 작성 시 필요)
CREATE POLICY "Everyone can view templates"
ON checklist_templates FOR SELECT
USING (true);


-- 4. checklist_submissions (제출 내역)
ALTER TABLE checklist_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view all submissions" ON checklist_submissions;
DROP POLICY IF EXISTS "Workers can create submissions" ON checklist_submissions;
DROP POLICY IF EXISTS "Workers can view own submissions" ON checklist_submissions;

-- 관리자: 모든 제출 내역 조회
CREATE POLICY "Admins view all submissions"
ON checklist_submissions FOR SELECT
USING (is_admin());

-- 팀장: 제출하기 (INSERT)
CREATE POLICY "Workers can create submissions"
ON checklist_submissions FOR INSERT
WITH CHECK (auth.uid() = worker_id);

-- 팀장: 본인이 제출한 내역 조회
CREATE POLICY "Workers can view own submissions"
ON checklist_submissions FOR SELECT
USING (auth.uid() = worker_id);
