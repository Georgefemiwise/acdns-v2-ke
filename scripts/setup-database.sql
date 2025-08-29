-- =============================================
-- CyberWatch Database Setup Script
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS TABLE
-- Stores user profile information linked to Supabase Auth
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'supervisor', 'administrator', 'viewer')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- CAMERAS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    stream_url TEXT NOT NULL,
    rtsp_url TEXT,
    ip_address INET,
    port INTEGER DEFAULT 554,
    username VARCHAR(100),
    password_encrypted TEXT,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'error')),
    resolution VARCHAR(20) DEFAULT '1920x1080',
    fps INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VEHICLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(30) DEFAULT 'car',
    owner_name VARCHAR(200) NOT NULL,
    owner_phone VARCHAR(20) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_address TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'expired')),
    registration_date DATE,
    expiry_date DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SMS RECIPIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.sms_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    notification_types TEXT[] DEFAULT ARRAY['detection', 'alert', 'system'],
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

CREATE INDEX IF NOT EXISTS idx_cameras_status ON public.cameras(status);
CREATE INDEX IF NOT EXISTS idx_cameras_is_active ON public.cameras(is_active);

CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);

CREATE INDEX IF NOT EXISTS idx_sms_recipients_phone ON public.sms_recipients(phone);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_is_active ON public.sms_recipients(is_active);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_recipients ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Authenticated users can read cameras, vehicles, and sms_recipients
CREATE POLICY "Authenticated users can read cameras" ON public.cameras
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sms_recipients" ON public.sms_recipients
    FOR SELECT TO authenticated USING (true);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cameras_updated_at ON public.cameras;
CREATE TRIGGER update_cameras_updated_at 
    BEFORE UPDATE ON public.cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_recipients_updated_at ON public.sms_recipients;
CREATE TRIGGER update_sms_recipients_updated_at 
    BEFORE UPDATE ON public.sms_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample cameras
INSERT INTO public.cameras (name, location, stream_url, ip_address, status) VALUES
('Main Entrance Camera', 'Building A - Main Gate', 'rtsp://192.168.1.100:554/stream1', '192.168.1.100', 'online'),
('Parking Lot Camera', 'Parking Zone B', 'rtsp://192.168.1.101:554/stream1', '192.168.1.101', 'online'),
('Exit Gate Camera', 'Building A - Exit Gate', 'rtsp://192.168.1.102:554/stream1', '192.168.1.102', 'offline'),
('Side Entrance Camera', 'Building A - Side Gate', 'rtsp://192.168.1.103:554/stream1', '192.168.1.103', 'online')
ON CONFLICT DO NOTHING;

-- Insert sample SMS recipients
INSERT INTO public.sms_recipients (name, phone, role, department, notification_types) VALUES
('Security Team', '+1-555-0101', 'Security Officer', 'Security', ARRAY['detection', 'alert', 'system']),
('Manager Office', '+1-555-0102', 'Manager', 'Operations', ARRAY['alert', 'system']),
('Emergency Contact', '+1-555-0103', 'Emergency Response', 'Security', ARRAY['alert']),
('Parking Authority', '+1-555-0104', 'Parking Officer', 'Operations', ARRAY['detection'])
ON CONFLICT DO NOTHING;
