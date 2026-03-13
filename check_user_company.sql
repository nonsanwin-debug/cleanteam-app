SELECT u.id, u.name as user_name, u.company_id, u.role, c.name as company_name, c.code 
FROM users u 
LEFT JOIN companies c ON u.company_id = c.id 
WHERE u.name = '김용민' OR u.role = 'admin' 
ORDER BY u.created_at DESC LIMIT 5;
