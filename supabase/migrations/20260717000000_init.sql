-- =============================================================
-- AgapSense — Full Database Schema
-- Run this ONCE in the Supabase SQL Editor on a fresh project.
-- =============================================================

-- =====================
-- 1. TABLES
-- =====================

-- Devices table
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

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'bfp_responder', 'resident')),
    contact_number TEXT,
    device_id UUID REFERENCES devices(id),
    address TEXT,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sensor readings table
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

CREATE INDEX idx_sensor_readings_device_recorded_at
    ON sensor_readings (device_id, recorded_at DESC);

-- Alert events table
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

-- Login attempts table
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Station settings table (singleton — only 1 row allowed)
CREATE TABLE station_settings (
    id INT PRIMARY KEY DEFAULT 1,
    station_name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT NOT NULL,
    key_personnel JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE station_settings
    ADD CONSTRAINT station_settings_id_check CHECK (id = 1);

-- Registration requests table
CREATE TABLE registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    requested_role TEXT NOT NULL CHECK (requested_role IN ('resident', 'bfp_responder')),
    device_code TEXT,
    organization TEXT,
    position TEXT,
    verification_info TEXT,
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);


-- =====================
-- 2. DEFAULT DATA
-- =====================

INSERT INTO settings (key, value) VALUES
    ('timeout_admin', '15'),
    ('timeout_bfp', '15'),
    ('timeout_resident', '60');

INSERT INTO station_settings (id, station_name, address, contact_number, email, key_personnel)
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


-- =====================
-- 3. FUNCTIONS & TRIGGERS
-- =====================

-- Role-check function (SECURITY DEFINER bypasses RLS to avoid infinite recursion)
-- Returns NULL for non-approved users, which denies all role-gated policies.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND status = 'approved';
$$;

-- NOTE: No handle_new_user trigger here. Profile creation is handled by
-- the edge functions (register, create-user) which insert richer data
-- (role, address, status, contact_number). A trigger would conflict
-- and cause duplicate key errors on profiles.id.

-- Prevent users from self-promoting (changing their own role/status via direct API)
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_profile_fields_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();


-- =====================
-- 4. ROW LEVEL SECURITY
-- =====================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- ── Devices ──
CREATE POLICY "Admin full access on devices"
  ON devices FOR ALL USING (get_auth_role() = 'admin');
CREATE POLICY "BFP Responder can read devices"
  ON devices FOR SELECT USING (get_auth_role() = 'bfp_responder');
CREATE POLICY "Resident can read own device"
  ON devices FOR SELECT USING (
    get_auth_role() = 'resident'
    AND id = (SELECT device_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- ── Profiles ──
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admin delete access on profiles"
  ON profiles FOR DELETE USING (get_auth_role() = 'admin');
CREATE POLICY "Admin insert access on profiles"
  ON profiles FOR INSERT WITH CHECK (get_auth_role() = 'admin');

-- ── Sensor Readings ──
CREATE POLICY "Admin can read all sensor readings"
  ON sensor_readings FOR SELECT USING (get_auth_role() = 'admin');
CREATE POLICY "BFP Responder can read all sensor readings"
  ON sensor_readings FOR SELECT USING (get_auth_role() = 'bfp_responder');
CREATE POLICY "Resident can read own device sensor readings"
  ON sensor_readings FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Allow devices to insert readings"
  ON sensor_readings FOR INSERT WITH CHECK (true);

-- ── Alert Events ──
CREATE POLICY "Admin full access on alert events"
  ON alert_events FOR ALL USING (get_auth_role() = 'admin');
CREATE POLICY "BFP Responder can read all alert events"
  ON alert_events FOR SELECT USING (get_auth_role() = 'bfp_responder');
CREATE POLICY "Resident can read own device alert events"
  ON alert_events FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Allow system to insert alerts"
  ON alert_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow system to update alerts"
  ON alert_events FOR UPDATE USING (
    get_auth_role() IN ('admin', 'bfp_responder')
  );

-- ── Login Attempts ──
CREATE POLICY "Admin can read login attempts"
  ON login_attempts FOR SELECT USING (get_auth_role() = 'admin');
CREATE POLICY "Allow inserting login attempts"
  ON login_attempts FOR INSERT WITH CHECK (true);

-- ── Settings ──
CREATE POLICY "Admin full access on settings"
  ON settings FOR ALL USING (get_auth_role() = 'admin');
CREATE POLICY "Anyone authenticated can read settings"
  ON settings FOR SELECT USING (auth.role() = 'authenticated');

-- ── Station Settings ──
CREATE POLICY "Station settings are viewable by everyone."
  ON station_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Station settings are updatable by admins and responders."
  ON station_settings FOR UPDATE USING (
    get_auth_role() = 'admin' OR get_auth_role() = 'bfp_responder'
  );
CREATE POLICY "Station settings are insertable by admins and responders."
  ON station_settings FOR INSERT WITH CHECK (
    get_auth_role() = 'admin' OR get_auth_role() = 'bfp_responder'
  );

-- ── Registration Requests ──
CREATE POLICY "Admin full access on registration_requests"
  ON registration_requests FOR ALL USING (get_auth_role() = 'admin');
CREATE POLICY "Users can read own registration"
  ON registration_requests FOR SELECT USING (user_id = auth.uid());
