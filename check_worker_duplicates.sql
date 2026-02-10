-- Check for Duplicate Workers (Same Name)
-- This script will list workers who share the same name, along with how many sites they are assigned to.
-- Use this to decide which one to keep.

SELECT 
    u.id, 
    u.name, 
    u.phone,
    u.created_at, 
    u.role,
    (SELECT count(*) FROM sites s WHERE s.worker_id = u.id) as assigned_sites_count
FROM users u
WHERE u.name IN (
    SELECT name 
    FROM users 
    WHERE role = 'worker' 
    GROUP BY name 
    HAVING count(*) > 1
)
AND u.role = 'worker'
ORDER BY u.name, u.created_at;

-- If you see duplicates, check 'assigned_sites_count'.
-- Usually, the one with count > 0 is the real one.
-- Or the one with the earlier created_at date.
