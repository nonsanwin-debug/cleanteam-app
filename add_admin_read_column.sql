-- 업체(어드민)가 마스터의 답변을 읽었는지 확인하기 위한 상태값 추가
ALTER TABLE public.admin_inquiries
ADD COLUMN admin_read BOOLEAN NOT NULL DEFAULT false;

-- 새로고침
NOTIFY pgrst, 'reload schema';
