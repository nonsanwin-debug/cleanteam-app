-- =============================================
-- 워커 페이지 완료 작업 숨기기 (관리자 페이지에는 영향 없음)
-- 각 워커가 독립적으로 완료된 현장을 숨길 수 있음
-- =============================================

CREATE TABLE IF NOT EXISTS worker_hidden_sites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    hidden_at timestamptz DEFAULT now(),
    UNIQUE(user_id, site_id)
);

-- RLS 활성화
ALTER TABLE worker_hidden_sites ENABLE ROW LEVEL SECURITY;

-- 정책: 자기 자신의 숨기기 기록만 조회/관리
DROP POLICY IF EXISTS "worker_hidden_own" ON worker_hidden_sites;
CREATE POLICY "worker_hidden_own" ON worker_hidden_sites
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_worker_hidden_user ON worker_hidden_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_hidden_site ON worker_hidden_sites(site_id);
