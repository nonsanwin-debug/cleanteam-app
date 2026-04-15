-- 플랫폼 전역 설정 테이블 (마스터 관리용)
-- 싱글톤 패턴: 항상 1개 row만 유지
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    global_free_old_building boolean DEFAULT false,   -- 전역 구축 할증 무료
    global_free_interior boolean DEFAULT false,        -- 전역 인테리어 할증 무료
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- 초기 데이터 삽입 (한 행만 유지)
INSERT INTO public.platform_settings (global_free_old_building, global_free_interior)
VALUES (false, false)
ON CONFLICT DO NOTHING;

-- RLS 활성화
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- 마스터만 업데이트 가능
CREATE POLICY "Master can update platform settings"
ON public.platform_settings FOR UPDATE
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'master'
);

-- 마스터만 삽입 가능 (초기화 용)
CREATE POLICY "Master can insert platform settings"
ON public.platform_settings FOR INSERT
WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'master'
);
