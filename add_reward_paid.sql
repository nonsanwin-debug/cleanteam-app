ALTER TABLE public.shared_orders ADD COLUMN IF NOT EXISTS reward_paid BOOLEAN DEFAULT false;
