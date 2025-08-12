-- =============================================
-- Fix Row Level Security Policies
-- Enable proper CRUD operations for authenticated users
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

DROP POLICY IF EXISTS "Users can view cameras" ON cameras;
DROP POLICY IF EXISTS "Users can manage cameras" ON cameras;

DROP POLICY IF EXISTS "Users can view detections" ON detections;
DROP POLICY IF EXISTS "Users can manage detections" ON detections;

DROP POLICY IF EXISTS "Users can view own sms_recipients" ON sms_recipients;
DROP POLICY IF EXISTS "Users can insert own sms_recipients" ON sms_recipients;
DROP POLICY IF EXISTS "Users can update own sms_recipients" ON sms_recipients;
DROP POLICY IF EXISTS "Users can delete own sms_recipients" ON sms_recipients;

DROP POLICY IF EXISTS "Users can view sms_messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can insert sms_messages" ON sms_messages;
DROP POLICY IF EXISTS "Users can update sms_messages" ON sms_messages;

DROP POLICY IF EXISTS "Users can view sms_delivery_log" ON sms_delivery_log;
DROP POLICY IF EXISTS "Users can insert sms_delivery_log" ON sms_delivery_log;

-- =============================================
-- USER POLICIES
-- =============================================
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id::uuid);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id::uuid);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id::uuid);

-- =============================================
-- VEHICLE POLICIES
-- =============================================
CREATE POLICY "Users can view own vehicles" ON vehicles
    FOR SELECT USING (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can insert own vehicles" ON vehicles
    FOR INSERT WITH CHECK (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can update own vehicles" ON vehicles
    FOR UPDATE USING (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own vehicles" ON vehicles
    FOR DELETE USING (auth.uid()::text = created_by OR created_by IS NULL);

-- =============================================
-- CAMERA POLICIES
-- =============================================
CREATE POLICY "Users can view cameras" ON cameras
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage cameras" ON cameras
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- DETECTION POLICIES
-- =============================================
CREATE POLICY "Users can view detections" ON detections
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage detections" ON detections
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- SMS RECIPIENT POLICIES
-- =============================================
CREATE POLICY "Users can view own sms_recipients" ON sms_recipients
    FOR SELECT USING (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can insert own sms_recipients" ON sms_recipients
    FOR INSERT WITH CHECK (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can update own sms_recipients" ON sms_recipients
    FOR UPDATE USING (auth.uid()::text = created_by OR created_by IS NULL);

CREATE POLICY "Users can delete own sms_recipients" ON sms_recipients
    FOR DELETE USING (auth.uid()::text = created_by OR created_by IS NULL);

-- =============================================
-- SMS MESSAGE POLICIES
-- =============================================
CREATE POLICY "Users can view sms_messages" ON sms_messages
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sms_messages" ON sms_messages
    FOR INSERT WITH CHECK (auth.uid()::text = sent_by OR sent_by IS NULL);

CREATE POLICY "Users can update sms_messages" ON sms_messages
    FOR UPDATE USING (auth.uid()::text = sent_by OR sent_by IS NULL);

-- =============================================
-- SMS DELIVERY LOG POLICIES
-- =============================================
CREATE POLICY "Users can view sms_delivery_log" ON sms_delivery_log
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sms_delivery_log" ON sms_delivery_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- SYSTEM SETTINGS POLICIES (Admin only)
-- =============================================
CREATE POLICY "Admins can manage system_settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::uuid = auth.uid() 
            AND users.role = 'administrator'
        )
    );

-- =============================================
-- ACTIVITY LOG POLICIES
-- =============================================
CREATE POLICY "Users can view activity_logs" ON activity_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert activity_logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

-- =============================================
-- CAMERA ZONE POLICIES
-- =============================================
CREATE POLICY "Users can view camera_zones" ON camera_zones
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage camera_zones" ON camera_zones
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- CREATE USER PROFILE FUNCTION
-- Automatically create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'operator',
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant specific permissions for anon users (for signup)
GRANT INSERT ON users TO anon;

COMMIT;
