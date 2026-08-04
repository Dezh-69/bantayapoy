-- Drop all problematic policies on profiles
DROP POLICY IF EXISTS "Admin full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Resident can update own profile" ON profiles;

-- Simply allow ALL authenticated users to READ any profile (removes the recursion completely)
CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT USING ( auth.role() = 'authenticated' );

-- Users can only UPDATE their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ( id = auth.uid() ) WITH CHECK ( id = auth.uid() );

-- For admins to create/delete profiles, they typically use the service role key on the backend.
-- If you need admins to delete profiles from the frontend, you can use the SECURITY DEFINER function we created earlier:
CREATE POLICY "Admin delete access on profiles" ON profiles FOR DELETE USING ( get_auth_role() = 'admin' );
CREATE POLICY "Admin insert access on profiles" ON profiles FOR INSERT WITH CHECK ( get_auth_role() = 'admin' );
