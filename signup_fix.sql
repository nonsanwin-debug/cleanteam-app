-- ========================================
-- 회원가입 문제 해결 SQL 스크립트
-- ========================================
-- 이 스크립트는 회원가입이 작동하지 않는 문제를 해결합니다.
-- Supabase Dashboard > SQL Editor에서 실행하세요.

-- 1. 회원가입 트리거 재활성화
-- (emergency_fix.sql에서 비활성화되었던 트리거를 다시 생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- auth.users에 새 사용자가 생성되면 자동으로 public.users에도 레코드 생성
  INSERT INTO public.users (id, name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', '사용자'),
    COALESCE(new.raw_user_meta_data->>'role', 'worker')
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- 이미 존재하는 경우 업데이트
    UPDATE public.users 
    SET 
      name = COALESCE(new.raw_user_meta_data->>'name', name),
      role = COALESCE(new.raw_user_meta_data->>'role', role)
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- 다른 오류는 무시하고 회원가입은 계속 진행
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. 기존 auth.users에는 있지만 public.users에 없는 사용자들 동기화
INSERT INTO public.users (id, name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', '사용자'),
  COALESCE(raw_user_meta_data->>'role', 'worker')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. 결과 확인
SELECT 
  u.id,
  u.name, 
  u.role, 
  a.email,
  u.created_at
FROM public.users u 
JOIN auth.users a ON u.id = a.id
ORDER BY u.created_at DESC;

-- ========================================
-- 참고사항:
-- ========================================
-- 이 스크립트 실행 후에도 회원가입이 안 된다면,
-- Supabase Dashboard > Authentication > Settings > Email Auth에서
-- "Confirm email" 옵션을 확인하고 비활성화해야 합니다.
