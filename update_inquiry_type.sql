ALTER TABLE public.admin_inquiries DROP CONSTRAINT IF EXISTS admin_inquiries_type_check;
ALTER TABLE public.admin_inquiries ADD CONSTRAINT admin_inquiries_type_check CHECK (type IN ('general', 'banner', 'point', 'notice'));
