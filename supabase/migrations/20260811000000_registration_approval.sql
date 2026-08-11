-- =============================================================
-- Migration: Self-Registration & Admin Approval Workflow
-- =============================================================

-- 1. Add 'status' and 'address' columns to profiles
ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected'));
ALTER TABLE profiles ADD COLUMN address TEXT;

-- 2. Create registration_requests table for extra registration metadata
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

-- 3. Enable RLS on registration_requests
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything on registration_requests
CREATE POLICY "Admin full access on registration_requests"
  ON registration_requests FOR ALL
  USING ( get_auth_role() = 'admin' );

-- RLS: Users can read their own registration request
CREATE POLICY "Users can read own registration"
  ON registration_requests FOR SELECT
  USING ( user_id = auth.uid() );

-- 4. Update get_auth_role() to block non-approved users from role-gated resources.
--    If a user's status is not 'approved', get_auth_role() returns NULL,
--    which causes all role-based policies (devices, sensor_readings, alerts, etc.) to deny access.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND status = 'approved';
$$;

-- 5. Trigger to prevent users from self-promoting (changing own status/role via direct API calls).
--    Edge functions using the service role key have auth.uid() = NULL, so they bypass this check.
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    -- A user is updating their own profile: revert status and role changes silently
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
FOR EACH ROW
EXECUTE FUNCTION protect_profile_fields();
