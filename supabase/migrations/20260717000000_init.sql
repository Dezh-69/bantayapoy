-- Create devices table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    location_desc TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    co_threshold INTEGER NOT NULL DEFAULT 200,
    temp_threshold FLOAT NOT NULL DEFAULT 60.0,
    bfp_contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ
);

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'bfp_responder', 'resident')),
    contact_number TEXT,
    device_id UUID REFERENCES devices(id),
    setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sensor_readings table
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id),
    co_ppm FLOAT NOT NULL,
    temp_celsius FLOAT NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    gps_valid BOOLEAN NOT NULL DEFAULT FALSE,
    on_battery BOOLEAN NOT NULL DEFAULT FALSE,
    sensor_ready BOOLEAN NOT NULL DEFAULT TRUE,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sensor_readings_device_recorded_at ON sensor_readings (device_id, recorded_at DESC);

-- Create alert_events table
CREATE TABLE alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id),
    alert_tier INTEGER NOT NULL CHECK (alert_tier IN (1, 2)),
    co_ppm FLOAT NOT NULL,
    temp_celsius FLOAT NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    gps_valid BOOLEAN NOT NULL DEFAULT FALSE,
    address_resolved TEXT,
    telegram_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sms_sent_owner BOOLEAN NOT NULL DEFAULT FALSE,
    sms_sent_bfp BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    triggered_at TIMESTAMPTZ DEFAULT now()
);

-- Create login_attempts table
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Create settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('timeout_admin', '15'),
('timeout_bfp', '15'),
('timeout_resident', '60');

-- Enable RLS on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Devices: Admin has full CRUD, BFP Responder can select, Resident can select their own
CREATE POLICY "Admin full access on devices" ON devices FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "BFP Responder can read devices" ON devices FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'bfp_responder'
);
CREATE POLICY "Resident can read own device" ON devices FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'resident' AND 
    id = (SELECT device_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Profiles: Admin has full CRUD, BFP Responder selects own, Resident selects/updates own
CREATE POLICY "Admin full access on profiles" ON profiles FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (
    id = auth.uid()
);
CREATE POLICY "Resident can update own profile" ON profiles FOR UPDATE USING (
    id = auth.uid() AND role = 'resident'
) WITH CHECK (
    id = auth.uid() AND role = 'resident'
);

-- Sensor Readings: Admin full select, BFP full select, Resident own device
CREATE POLICY "Admin can read all sensor readings" ON sensor_readings FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "BFP Responder can read all sensor readings" ON sensor_readings FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'bfp_responder'
);
CREATE POLICY "Resident can read own device sensor readings" ON sensor_readings FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
);

-- Alert Events: Admin full CRUD, BFP full select, Resident own device
CREATE POLICY "Admin full access on alert events" ON alert_events FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "BFP Responder can read all alert events" ON alert_events FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'bfp_responder'
);
CREATE POLICY "Resident can read own device alert events" ON alert_events FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
);

-- Login Attempts: Admin full select
CREATE POLICY "Admin can read login attempts" ON login_attempts FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Settings: Admin full CRUD, others select
CREATE POLICY "Admin full access on settings" ON settings FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Anyone authenticated can read settings" ON settings FOR SELECT USING (
    auth.role() = 'authenticated'
);
