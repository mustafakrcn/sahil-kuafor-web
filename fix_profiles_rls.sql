CREATE POLICY "authenticated_can_select_profiles" ON profiles FOR SELECT TO authenticated USING (true);
