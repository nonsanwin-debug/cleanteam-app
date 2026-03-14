-- Add bank account information columns to the users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload config';
