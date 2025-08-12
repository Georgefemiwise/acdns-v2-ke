-- =============================================
-- Fix Row Level Security Policies
-- Run this in your Supabase SQL Editor
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read cameras" ON public.cameras;
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can read sms_recipients" ON public.sms_recipients;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- VEHICLES TABLE POLICIES
-- =============================================

-- Authenticated users can read all vehicles
CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert vehicles
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Users can update vehicles they created
CREATE POLICY "Users can update own vehicles" ON public.vehicles
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Users can delete vehicles they created
CREATE POLICY "Users can delete own vehicles" ON public.vehicles
    FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- =============================================
-- CAMERAS TABLE POLICIES
-- =============================================

-- Authenticated users can read all cameras
CREATE POLICY "Authenticated users can read cameras" ON public.cameras
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert cameras
CREATE POLICY "Authenticated users can insert cameras" ON public.cameras
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Users can update cameras they created
CREATE POLICY "Users can update own cameras" ON public.cameras
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Users can delete cameras they created
CREATE POLICY "Users can delete own cameras" ON public.cameras
    FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- =============================================
-- SMS RECIPIENTS TABLE POLICIES
-- =============================================

-- Authenticated users can read all SMS recipients
CREATE POLICY "Authenticated users can read sms_recipients" ON public.sms_recipients
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert SMS recipients
CREATE POLICY "Authenticated users can insert sms_recipients" ON public.sms_recipients
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Users can update SMS recipients they created
CREATE POLICY "Users can update own sms_recipients" ON public.sms_recipients
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Users can delete SMS recipients they created
CREATE POLICY "Users can delete own sms_recipients" ON public.sms_recipients
    FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- =============================================
-- DETECTIONS TABLE POLICIES (if it exists)
-- =============================================

-- Create detections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id),
    license_plate VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image_url TEXT,
    bounding_box JSONB,
    additional_data JSONB,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on detections
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

-- Detections policies
CREATE POLICY "Authenticated users can read detections" ON public.detections
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert detections" ON public.detections
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update detections" ON public.detections
    FOR UPDATE TO authenticated USING (true);

-- =============================================
-- SMS MESSAGES TABLE POLICIES (if it exists)
-- =============================================

-- Create SMS messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'detection',
    recipients_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'partial')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status JSONB,
    related_detection_id UUID REFERENCES public.detections(id),
    related_vehicle_id UUID REFERENCES public.vehicles(id),
    sent_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on SMS messages
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- SMS messages policies
CREATE POLICY "Authenticated users can read sms_messages" ON public.sms_messages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sms_messages" ON public.sms_messages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "Users can update own sms_messages" ON public.sms_messages
    FOR UPDATE TO authenticated USING (auth.uid() = sent_by);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON public.vehicles(created_by);
CREATE INDEX IF NOT EXISTS idx_cameras_created_by ON public.cameras(created_by);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_created_by ON public.sms_recipients(created_by);
CREATE INDEX IF NOT EXISTS idx_detections_camera_id ON public.detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_detections_vehicle_id ON public.detections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON public.detections(detection_timestamp DESC);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.vehicles TO authenticated;
GRANT ALL ON public.cameras TO authenticated;
GRANT ALL ON public.sms_recipients TO authenticated;
GRANT ALL ON public.detections TO authenticated;
GRANT ALL ON public.sms_messages TO authenticated;

-- Grant select permissions to anon for public data if needed
GRANT SELECT ON public.cameras TO anon;

-- =============================================
-- VERIFY POLICIES
-- =============================================

-- Check if policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
