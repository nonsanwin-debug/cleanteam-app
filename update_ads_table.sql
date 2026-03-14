-- ads 테이블에 전화번호(phone_number) 칼럼 추가
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS phone_number text;
