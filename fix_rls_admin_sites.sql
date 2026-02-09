-- 관리자 및 현장 팀장을 위한 RLS 정책 수정 (중복 오류 해결 버전)

-- 1. sites 테이블의 기존 정책 모두 삭제 (이름 충돌 방지)
DROP POLICY IF EXISTS "Admins can do everything on sites" ON sites;
DROP POLICY IF EXISTS "Workers can view assigned sites" ON sites;
DROP POLICY IF EXISTS "Workers can update assigned sites" ON sites; -- 이 이름이 중복됨
DROP POLICY IF EXISTS "Workers can update status of assigned sites" ON sites;
DROP POLICY IF EXISTS "Enable read access for all users" ON sites;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sites;
DROP POLICY IF EXISTS "Enable update for users based on email" ON sites;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON sites;
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;

-- 2. sites 테이블 RLS 활성화 (이미 되어있어도 무관)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- 3. 관리자(admin)는 모든 권한을 가짐
CREATE POLICY "Admins can do everything on sites"
ON sites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 4. 현장 팀장(worker)은 자신에게 할당된 현장만 조회 가능
CREATE POLICY "Workers can view assigned sites"
ON sites
FOR SELECT
USING (
  worker_id = auth.uid()
);

-- 5. 현장 팀장(worker)은 자신에게 할당된 현장의 상태 등을 수정 가능
CREATE POLICY "Workers can update assigned sites"
ON sites
FOR UPDATE
USING (
  worker_id = auth.uid()
);

-- 6. users 테이블 정책 보완 (팀장 목록 조회 권한)
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- 관리자는 모든 사용자 조회 가능
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- 일반 사용자는 자기 자신만 조회 가능 (기본)
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (
  auth.uid() = id
);
