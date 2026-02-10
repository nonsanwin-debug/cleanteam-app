-- Add worker_type column to users table
-- This allows distinguishing between team leaders and team members

-- 1. Add worker_type column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS worker_type TEXT DEFAULT 'member';

-- 2. Set existing workers as 'leader' (they are currently team leaders)
UPDATE users 
SET worker_type = 'leader' 
WHERE role = 'worker';

-- 3. Add comment for documentation
COMMENT ON COLUMN users.worker_type IS 'Type of worker: leader (팀장) or member (팀원)';

-- 4. Verify the changes
SELECT 
    id,
    name,
    role,
    worker_type,
    created_at
FROM users
WHERE role = 'worker'
ORDER BY name;
