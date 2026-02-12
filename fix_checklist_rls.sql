-- ==========================================
-- 체크리스트 템플릿 RLS 정책 완전 재설정
-- Supabase SQL Editor에서 실행해주세요
-- ==========================================

-- 1. 현재 모든 정책 삭제
DROP POLICY IF EXISTS "Admins manage templates" ON checklist_templates;
DROP POLICY IF EXISTS "Everyone can view templates" ON checklist_templates;
DROP POLICY IF EXISTS "Admins can manage company templates" ON checklist_templates;
DROP POLICY IF EXISTS "Users can view templates" ON checklist_templates;
DROP POLICY IF EXISTS "Public View Templates" ON checklist_templates;

-- 2. RLS 활성화 확인
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- 3. 새 정책: 인증된 사용자는 모든 작업 가능
CREATE POLICY "Authenticated users can manage templates"
ON checklist_templates FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. 확인용: 현재 데이터 조회
SELECT id, title, company_id, created_at FROM checklist_templates ORDER BY created_at DESC;
