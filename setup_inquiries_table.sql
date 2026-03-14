-- 업체가 마스터에게 보내는 1:1 문의/요청 테이블 생성
CREATE TABLE public.admin_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('general', 'banner', 'point')),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.admin_inquiries ENABLE ROW LEVEL SECURITY;

-- 마스터는 모든 문의를 볼 수 있음 (profiles 테이블의 role = 'master')
CREATE POLICY "Masters can view all admin inquiries" 
    ON public.admin_inquiries FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'master'
        )
    );

-- 마스터는 문의 상태를 업데이트할 수 있음
CREATE POLICY "Masters can update admin inquiries" 
    ON public.admin_inquiries FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'master'
        )
    );

-- 업체 소속 관리자(어드민)는 자신이 속한 업체의 문의만 볼 수 있음
-- 주의: 사용자 모델에서 user_id와 company_id를 연결짓는 구조를 따라야 함.
-- 현 프로젝트 구조(users_companies)를 기반으로 작성.
CREATE POLICY "Admins can view their own company inquiries" 
    ON public.admin_inquiries FOR SELECT 
    USING (
        company_id IN (
            SELECT company_id 
            FROM users_companies 
            WHERE user_id = auth.uid()
        )
    );

-- 업체 소속 관리자(어드민)는 자신이 속한 업체로 문의를 생성할 수 있음
CREATE POLICY "Admins can create inquiries for their company" 
    ON public.admin_inquiries FOR INSERT 
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM users_companies 
            WHERE user_id = auth.uid()
        )
    );
