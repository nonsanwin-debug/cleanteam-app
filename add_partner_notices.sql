-- 파트너 공지사항 테이블
CREATE TABLE IF NOT EXISTS public.partner_notices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text DEFAULT '',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS 비활성화 (admin client로만 접근)
ALTER TABLE public.partner_notices ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 읽기 허용
CREATE POLICY "partner_notices_read" ON public.partner_notices
    FOR SELECT USING (true);

-- service_role만 쓰기 허용
CREATE POLICY "partner_notices_write" ON public.partner_notices
    FOR ALL USING (auth.role() = 'service_role');
