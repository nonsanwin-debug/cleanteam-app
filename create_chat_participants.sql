-- 채팅방 영구 참여자 목록 테이블 생성
CREATE TABLE IF NOT EXISTS site_chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'leader', 'customer', 'admin', 'guest'
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    push_endpoint TEXT,
    push_p256dh TEXT,
    push_auth TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(site_id, name, role)
);

-- RLS 활성화
ALTER TABLE site_chat_participants ENABLE ROW LEVEL SECURITY;

-- 누구나 참여자 조회 가능 (site_id 기반 접근 제어는 프론트엔드 및 UUID 보안 적용)
CREATE POLICY "Public read chat participants" ON site_chat_participants
    FOR SELECT USING (true);

-- 누구나 참여자 등록 가능
CREATE POLICY "Public insert chat participants" ON site_chat_participants
    FOR INSERT WITH CHECK (true);

-- 누구나 자신의 참여 상태 업데이트 가능
CREATE POLICY "Public update chat participants" ON site_chat_participants
    FOR UPDATE USING (true);

-- 실시간 Realtime 게시 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE site_chat_participants;
