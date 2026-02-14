-- 푸시 알림 구독 정보 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS 설정
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 자신의 구독만 관리 가능
CREATE POLICY "Users can manage own subscriptions"
ON push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 서버(서비스 역할)에서 모든 구독 조회 가능 (알림 발송용)
CREATE POLICY "Service role can read all subscriptions"
ON push_subscriptions
FOR SELECT
USING (true);
