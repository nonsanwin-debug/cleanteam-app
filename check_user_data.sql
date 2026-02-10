-- 특정 팀원(예: 박진헌)의 정보가 DB에 어떻게 저장되어 있는지 확인
SELECT 
    id, 
    name, 
    phone, 
    email, 
    role, 
    company_id, 
    worker_type, 
    account_info -- 이 부분이 NULL인지 확인이 필요함
FROM public.users
WHERE name LIKE '%박진헌%' -- 혹은 아이디 알고 계시면 아이디로 검색
ORDER BY created_at DESC;

-- 업체 목록 확인 (ID와 이름 매칭 확인용)
SELECT id, name FROM public.companies;
