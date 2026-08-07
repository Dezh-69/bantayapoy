-- Create station_settings table
CREATE TABLE IF NOT EXISTS public.station_settings (
    id int primary key default 1,
    station_name text not null,
    address text not null,
    contact_number text not null,
    email text not null,
    key_personnel jsonb not null default '[]'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure only one row exists
ALTER TABLE public.station_settings
ADD CONSTRAINT station_settings_id_check CHECK (id = 1);

-- Enable RLS
ALTER TABLE public.station_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view station settings
CREATE POLICY "Station settings are viewable by everyone." ON public.station_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins and responders to update station settings
CREATE POLICY "Station settings are updatable by admins and responders." ON public.station_settings
    FOR UPDATE USING (
        public.get_auth_role() = 'admin' OR 
        public.get_auth_role() = 'bfp_responder'
    );

-- Allow admins and responders to insert (initial row) if it doesn't exist
CREATE POLICY "Station settings are insertable by admins and responders." ON public.station_settings
    FOR INSERT WITH CHECK (
        public.get_auth_role() = 'admin' OR 
        public.get_auth_role() = 'bfp_responder'
    );

-- Insert default row
INSERT INTO public.station_settings (id, station_name, address, contact_number, email, key_personnel)
VALUES (
    1,
    'Bureau of Fire Protection — Quezon City Station 7',
    '123 Commonwealth Ave, Barangay Holy Spirit, Quezon City, Metro Manila 1127',
    '+63 2 8555 1234',
    'station7@bfp.gov.ph',
    '[
        {"title": "Station Commander / Fire Chief", "name": "SFO4 Juan Dela Cruz", "contact": "+63 917 123 4567"},
        {"title": "Deputy Fire Chief", "name": "FO3 Maria Santos", "contact": "+63 918 234 5678"},
        {"title": "Operations Officer", "name": "FO2 Pedro Reyes", "contact": "+63 919 345 6789"},
        {"title": "Fire Marshal", "name": "SFO1 Ana Bautista", "contact": "+63 920 456 7890"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
