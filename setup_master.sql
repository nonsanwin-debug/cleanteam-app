-- 1. users 테이블의 role 제약 조건에 'master' 추가
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'worker', 'master'));

-- 2. master 권한의 전체 접근을 허용하는 핵심 정책 몇 가지 추가
-- 회사 전체 조회
CREATE POLICY "Master can view all companies" ON public.companies FOR SELECT USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'master'
);

-- 유저 전체 조회 및 관리
CREATE POLICY "Master can full access users" ON public.users FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'master'
);

-- 현장 전체 조회 및 관리
CREATE POLICY "Master can full access sites" ON public.sites FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'master'
);

-- 최고관리자용 가상 업체(NEXUS 시스템) 생성
INSERT INTO public.companies (name, code, company_code)
VALUES ('NEXUS 시스템', 'MSTR', 'MSTR')
ON CONFLICT (name, code) DO NOTHING;
