-- Check if payment was actually processed
-- Run this to see the current state of the site and user

-- 1. Check the site's payment status
SELECT 
    id,
    name,
    worker_id,
    payment_status,
    claimed_amount,
    updated_at
FROM sites
WHERE name LIKE '%오봉현%'  -- Replace with the actual site name from screenshot
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Check the worker's current balance
SELECT 
    id,
    name,
    current_money,
    updated_at
FROM users
WHERE name = '오봉현'  -- Replace with actual worker name
LIMIT 1;

-- 3. Check if the RPC function exists
SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'approve_payment_admin';

-- 4. Test the RPC function manually (replace UUIDs with actual values)
-- First, get the actual UUIDs:
SELECT 
    s.id as site_id,
    s.worker_id as user_id,
    s.claimed_amount
FROM sites s
WHERE s.name LIKE '%오봉현%'
AND s.payment_status = 'requested'
LIMIT 1;

-- Then use those UUIDs to test the RPC:
-- SELECT approve_payment_admin(
--     'SITE_UUID_HERE'::uuid,
--     'USER_UUID_HERE'::uuid,
--     65500
-- );
