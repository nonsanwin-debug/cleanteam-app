-- 1. users 테이블의 기존 정책 확인 및 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- 2. 무한 재귀 방지를 위한 우회 전략: View 생성 (보안상 권장되진 않으나 빠른 해결책)
-- 또는 auth.users (Supabase 관리 테이블)가 아닌 public.users 테이블을 조회하는 정책을 단순화

-- 3. 가장 확실한 방법: 모든 인증된 사용자가 'users' 테이블의 'id', 'name', 'role'만 조회할 수 있게 허용
-- (팀원 목록이 노출되어도 괜찮다면 이 방법이 가장 깔끔함)
CREATE POLICY "Enable read access for authenticated users"
ON users
FOR SELECT
TO authenticated
USING (true);

-- 만약 보안이 중요하다면, 아래와 같이 특정 컬럼만 선택적으로 허용하는 것은 RLS로 불가능하므로, 
-- Postgres Function을 만들어서 관리자 여부를 체크해야 함.

-- 4. Function을 이용한 관리자 체크 (Recursion 방지)
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

-- 5. 함수 기반 정책 생성
CREATE POLICY "Admins can view all users via function"
ON users
FOR SELECT
USING (is_admin());

CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);
