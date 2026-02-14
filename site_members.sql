-- 현장별 팀원 배정 테이블
CREATE TABLE IF NOT EXISTS site_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, user_id)
);

-- RLS 설정
ALTER TABLE site_members ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회/관리 가능
CREATE POLICY "Company users can manage site members"
ON site_members
FOR ALL
USING (true)
WITH CHECK (true);

-- 인덱스
CREATE INDEX idx_site_members_site_id ON site_members(site_id);
CREATE INDEX idx_site_members_user_id ON site_members(user_id);
