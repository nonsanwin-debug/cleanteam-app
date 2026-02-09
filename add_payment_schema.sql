-- Add payment related columns to users table
alter table users 
add column if not exists account_info text,
add column if not exists current_money integer default 0;

-- Add payment related columns to sites table
alter table sites
add column if not exists claimed_amount integer,
add column if not exists payment_status text check (payment_status in ('requested', 'paid'));

-- Index for faster lookup of pending claims
create index if not exists idx_sites_payment_status on sites(payment_status);
