-- =============================================
-- company_partners 테이블: 업체 간 파트너 관계 (공유 ON/OFF 토글 지원)
-- =============================================

CREATE TABLE IF NOT EXISTS public.company_partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    partner_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sharing_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, partner_company_id)
);

-- RLS 활성화
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

-- 정책: 서비스 역할(admin client)만 사용하므로 별도 정책 불필요
-- 하지만 안전을 위해 기본 정책 추가
DROP POLICY IF EXISTS "Users can manage own partners" ON public.company_partners;
CREATE POLICY "Users can manage own partners" ON public.company_partners
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM public.users WHERE id = auth.uid()
        )
    );
