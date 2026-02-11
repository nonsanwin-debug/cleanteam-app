-- [FINAL MASTER FIX] 대시보드 데이터 격리 및 이름 표시 오류 통합 해결 스크립트

-- 1. Helper Function 보강 (검사 경로 최적화 및 보안 강화)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. PHOTOS 테이블 스키마 보강 (작성자 추적용)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='photos' AND column_name='user_id') THEN
        ALTER TABLE public.photos ADD COLUMN user_id UUID REFERENCES public.users(id);
    END IF;
END $$;

-- 3. PHOTOS 테이블 RLS 정책 (업체별 엄격 격리)
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage photos" ON public.photos;
DROP POLICY IF EXISTS "Workers can upload photos to their sites" ON public.photos;
DROP POLICY IF EXISTS "Workers can view photos of their sites" ON public.photos;
DROP POLICY IF EXISTS "Strict company isolation for photos" ON public.photos;

CREATE POLICY "Strict company isolation for photos"
ON public.photos FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sites 
        WHERE sites.id = photos.site_id 
        AND sites.company_id = public.get_my_company_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sites 
        WHERE sites.id = photos.site_id 
        AND sites.company_id = public.get_my_company_id()
    )
);

-- 4. CHECKLIST_SUBMISSIONS 테이블 RLS 정책 (업체별 엄격 격리)
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Workers can create submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Workers can view own submissions" ON public.checklist_submissions;
DROP POLICY IF EXISTS "Strict company isolation for submissions" ON public.checklist_submissions;

CREATE POLICY "Strict company isolation for submissions"
ON public.checklist_submissions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sites 
        WHERE sites.id = checklist_submissions.site_id 
        AND sites.company_id = public.get_my_company_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sites 
        WHERE sites.id = checklist_submissions.site_id 
        AND sites.company_id = public.get_my_company_id()
    )
);

-- 5. SITES 및 USERS 테이블 정책 재확인 (누수 방지)
DROP POLICY IF EXISTS "Strict company isolation for sites" ON public.sites;
CREATE POLICY "Strict company isolation for sites"
ON public.sites FOR ALL
TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Strict company isolation for users" ON public.users;
CREATE POLICY "Strict company isolation for users"
ON public.users FOR ALL
TO authenticated
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

-- 6. 기존 데이터 정리 (작성자가 없어서 '알 수 없음'으로 뜨는 것을 방지하기 위해 현장 담당자로 백필 - 선택사항)
-- UPDATE public.photos SET user_id = (SELECT worker_id FROM public.sites WHERE sites.id = photos.site_id) WHERE user_id IS NULL;

NOTIFY pgrst, 'reload config';
