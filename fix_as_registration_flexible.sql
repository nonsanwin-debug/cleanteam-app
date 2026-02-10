-- 1. as_requests 테이블에 site_name 컬럼 추가
-- 기존에는 site_id (UUID)가 필수였으나, 이제 텍스트로도 입력 가능하게 합니다.
ALTER TABLE public.as_requests 
ADD COLUMN IF NOT EXISTS site_name TEXT;

-- 2. site_id 컬럼을 선택 사항(Nullable)으로 변경
ALTER TABLE public.as_requests 
ALTER COLUMN site_id DROP NOT NULL;

-- 3. 기존 데이터 보정 (site_id가 있는 경우 해당 현장명을 site_name에 복사)
UPDATE public.as_requests ar
SET site_name = s.name
FROM public.sites s
WHERE ar.site_id = s.id
AND ar.site_name IS NULL;

-- 4. 캐시 갱신
NOTIFY pgrst, 'reload config';

-- 5. 변경 확인
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'as_requests';
