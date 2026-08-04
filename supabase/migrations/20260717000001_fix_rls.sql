-- 1. Create a SECURITY DEFINER function to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop the old policies that caused the infinite recursion
DROP POLICY IF EXISTS "Admin full access on devices" ON devices;
DROP POLICY IF EXISTS "BFP Responder can read devices" ON devices;
DROP POLICY IF EXISTS "Resident can read own device" ON devices;

DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Resident can update own profile" ON profiles;

DROP POLICY IF EXISTS "Admin can read all sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "BFP Responder can read all sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Resident can read own device sensor readings" ON sensor_readings;

DROP POLICY IF EXISTS "Admin full access on alert events" ON alert_events;
DROP POLICY IF EXISTS "BFP Responder can read all alert events" ON alert_events;
DROP POLICY IF EXISTS "Resident can read own device alert events" ON alert_events;

DROP POLICY IF EXISTS "Admin can read login attempts" ON login_attempts;

DROP POLICY IF EXISTS "Admin full access on settings" ON settings;
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON settings;


-- 3. Recreate policies using the new function to avoid infinite loops

-- Devices
CREATE POLICY "Admin full access on devices" ON devices FOR ALL USING ( get_auth_role() = 'admin' );
CREATE POLICY "BFP Responder can read devices" ON devices FOR SELECT USING ( get_auth_role() = 'bfp_responder' );
CREATE POLICY "Resident can read own device" ON devices FOR SELECT USING (
    get_auth_role() = 'resident' AND 
    id = (SELECT device_id FROM profiles WHERE profiles.id = auth.uid())
);

-- Profiles
CREATE POLICY "Admin full access on profiles" ON profiles FOR ALL USING ( get_auth_role() = 'admin' );
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING ( id = auth.uid() );
CREATE POLICY "Resident can update own profile" ON profiles FOR UPDATE USING (
    id = auth.uid() AND role = 'resident'
) WITH CHECK (
    id = auth.uid() AND role = 'resident'
);

-- Sensor Readings
CREATE POLICY "Admin can read all sensor readings" ON sensor_readings FOR SELECT USING ( get_auth_role() = 'admin' );
CREATE POLICY "BFP Responder can read all sensor readings" ON sensor_readings FOR SELECT USING ( get_auth_role() = 'bfp_responder' );
CREATE POLICY "Resident can read own device sensor readings" ON sensor_readings FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
);

-- Alert Events
CREATE POLICY "Admin full access on alert events" ON alert_events FOR ALL USING ( get_auth_role() = 'admin' );
CREATE POLICY "BFP Responder can read all alert events" ON alert_events FOR SELECT USING ( get_auth_role() = 'bfp_responder' );
CREATE POLICY "Resident can read own device alert events" ON alert_events FOR SELECT USING (
    device_id = (SELECT device_id FROM profiles WHERE id = auth.uid())
);

-- Login Attempts
CREATE POLICY "Admin can read login attempts" ON login_attempts FOR SELECT USING ( get_auth_role() = 'admin' );

-- Settings
CREATE POLICY "Admin full access on settings" ON settings FOR ALL USING ( get_auth_role() = 'admin' );
CREATE POLICY "Anyone authenticated can read settings" ON settings FOR SELECT USING ( auth.role() = 'authenticated' );
