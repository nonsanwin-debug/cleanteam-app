-- 작업자 계정 및 이메일 확인
SELECT id, name, email, phone, role, worker_type, status
FROM public.users
WHERE role = 'worker'
ORDER BY created_at DESC;
