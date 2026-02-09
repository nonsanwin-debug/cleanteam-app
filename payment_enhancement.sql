-- 1. Add columns to 'sites' for enhanced claims
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS claim_details JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS claim_photos JSONB DEFAULT '[]'::JSONB;

-- 2. Create 'withdrawal_requests' table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can see their own requests
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users can create withdrawals" ON withdrawal_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all withdrawals" ON withdrawal_requests
    FOR SELECT TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Admins can update status
CREATE POLICY "Admins can update withdrawals" ON withdrawal_requests
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE ON withdrawal_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON withdrawal_requests TO service_role;
