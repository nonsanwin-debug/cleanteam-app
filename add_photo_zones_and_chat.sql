-- ============================================
-- Phase 1: photo_zones 컬럼 추가
-- ============================================
ALTER TABLE sites ADD COLUMN IF NOT EXISTS photo_zones jsonb DEFAULT NULL;
-- 예시: ["방1", "방2", "방3", "화1", "화2", "베1"]

-- ============================================
-- Phase 2: 현장 채팅 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS site_chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id uuid REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
    sender_name text NOT NULL,
    sender_phone text,
    sender_role text DEFAULT 'guest',  -- 'leader', 'customer', 'admin', 'guest'
    sender_user_id uuid,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_site_id ON site_chat_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON site_chat_messages(created_at);

-- RLS
ALTER TABLE site_chat_messages ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (site_id를 아는 사람만 접근 가능 - UUID 보안)
CREATE POLICY "Anyone can read chat messages" ON site_chat_messages
    FOR SELECT USING (true);

-- 공개 쓰기
CREATE POLICY "Anyone can insert chat messages" ON site_chat_messages
    FOR INSERT WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE site_chat_messages;

-- ============================================
-- Phase 3: photos 테이블의 type 제약조건 제거 (동적 공간명 매칭 허용)
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- photos 테이블의 'type' 컬럼과 관련된 모든 체크 제약 조건(CHECK constraint) 찾기 및 제거
    FOR r IN
        SELECT con.conname
        FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'photos'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%type%'
    LOOP
        EXECUTE 'ALTER TABLE photos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

