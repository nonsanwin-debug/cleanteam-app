-- AS Requests 테이블에 photos 컬럼 추가
ALTER TABLE public.as_requests 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
