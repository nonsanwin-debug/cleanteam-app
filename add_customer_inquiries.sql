CREATE TABLE IF NOT EXISTS public.customer_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    clean_type TEXT NOT NULL,
    structure_type TEXT NOT NULL,
    address TEXT NOT NULL,
    detail_address TEXT,
    area_size TEXT NOT NULL,
    work_date TEXT NOT NULL,
    time_preference TEXT NOT NULL,
    building_condition TEXT NOT NULL,
    notes TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' NOT NULL
);

-- RLS Settings
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public bookings)
CREATE POLICY "Allow public insert on customer_inquiries" 
ON public.customer_inquiries 
FOR INSERT 
TO public
WITH CHECK (true);

-- Only authenticated users (admins) can view/update
CREATE POLICY "Allow authenticated full access on customer_inquiries" 
ON public.customer_inquiries 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
