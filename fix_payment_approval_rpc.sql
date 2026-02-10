-- Fix payment approval by creating RPC function with SECURITY DEFINER
-- This allows admin to approve payments and update user balances

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS approve_payment_admin(uuid, uuid, numeric);

-- Create RPC function to approve payment (bypasses RLS)
CREATE OR REPLACE FUNCTION approve_payment_admin(
    site_id_param uuid,
    user_id_param uuid,
    amount_param numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance numeric;
    new_balance numeric;
    result json;
BEGIN
    -- 1. Update site payment status to 'paid'
    UPDATE sites
    SET payment_status = 'paid',
        updated_at = now()
    WHERE id = site_id_param;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Site not found');
    END IF;

    -- 2. Get current user balance
    SELECT current_money INTO current_balance
    FROM users
    WHERE id = user_id_param;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- 3. Update user balance
    new_balance := COALESCE(current_balance, 0) + amount_param;
    
    UPDATE users
    SET current_money = new_balance,
        updated_at = now()
    WHERE id = user_id_param;

    -- 4. Return success
    RETURN json_build_object(
        'success', true,
        'old_balance', COALESCE(current_balance, 0),
        'new_balance', new_balance
    );
END;
$$;

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION approve_payment_admin(uuid, uuid, numeric) TO authenticated;

-- Test the function (optional - comment out after testing)
-- SELECT approve_payment_admin(
--     'site-uuid-here'::uuid,
--     'user-uuid-here'::uuid,
--     50000
-- );
