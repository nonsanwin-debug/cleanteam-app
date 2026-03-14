ALTER TABLE public.admin_inquiries
ADD COLUMN reply TEXT;

-- 캐시 새로고침 (선택 사항)
NOTIFY pgrst, 'reload schema';
