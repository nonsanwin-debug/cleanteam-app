-- 1. photos 테이블을 Realtime 게시(Publication)에 추가
-- 이를 통해 DB 변경 사항이 실시간으로 클라이언트에 전달됩니다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'photos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
  END IF;
END
$$;

-- 2. 캐시 리로드 알림
NOTIFY pgrst, 'reload config';
