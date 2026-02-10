-- 1. Photos 테이블에 대해 공개 읽기 권한(RLS) 추가
-- 이 작업을 해야 고객용 공유 페이지에서 사진이 보입니다.
DROP POLICY IF EXISTS "Allow Anon Select Photos" ON public.photos;

CREATE POLICY "Allow Anon Select Photos"
ON public.photos FOR SELECT
TO anon
USING (true);

-- 2. (선택사항) 특정 현장에 실제 사진이 올라와 있는지 확인하는 쿼리
-- 아래 쿼리를 실행해서 결과가 나오는지 확인해 보세요.
-- SELECT * FROM public.photos WHERE site_id = '여기에_현장_ID_입력';

-- 3. 캐시 로드
NOTIFY pgrst, 'reload config';
