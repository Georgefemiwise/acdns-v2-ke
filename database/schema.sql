-- =============================================
-- CyberWatch Car Detection System Database Schema
-- Supabase PostgreSQL Database Structure
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS TABLE
-- Stores user authentication and profile information
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CAMERAS TABLE
-- Stores camera configuration and status information
-- =============================================
CREATE TABLE cameras (
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
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VEHICLES TABLE
-- Stores vehicle information and owner details
-- =============================================
CREATE TABLE vehicles (
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
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DETECTIONS TABLE
-- Stores car detection events from cameras
-- =============================================
CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id),
    license_plate VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image_url TEXT,
    bounding_box JSONB, -- Stores detection coordinates {x, y, width, height}
    additional_data JSONB, -- Stores extra detection metadata
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SMS_RECIPIENTS TABLE
-- Stores SMS notification recipients
-- =============================================
CREATE TABLE sms_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    notification_types TEXT[] DEFAULT ARRAY['detection', 'alert', 'system'], -- Array of notification types
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SMS_MESSAGES TABLE
-- Stores SMS message history and status
-- =============================================
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'detection',
    recipients_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'partial')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status JSONB, -- Stores individual recipient delivery status
    related_detection_id UUID REFERENCES detections(id),
    related_vehicle_id UUID REFERENCES vehicles(id),
    sent_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SMS_DELIVERY_LOG TABLE
-- Detailed delivery log for each SMS recipient
-- =============================================
CREATE TABLE sms_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES sms_recipients(id),
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYSTEM_SETTINGS TABLE
-- Stores application configuration settings
-- =============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ACTIVITY_LOGS TABLE
-- Stores user activity and system events
-- =============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- 'vehicle', 'camera', 'user', 'sms', etc.
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CAMERA_ZONES TABLE
-- Defines detection zones within camera views
-- =============================================
CREATE TABLE camera_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50) DEFAULT 'detection' CHECK (zone_type IN ('detection', 'restricted', 'parking', 'entrance', 'exit')),
    coordinates JSONB NOT NULL, -- Polygon coordinates defining the zone
    is_active BOOLEAN DEFAULT true,
    alert_enabled BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Cameras indexes
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_cameras_location ON cameras(location);
CREATE INDEX idx_cameras_is_active ON cameras(is_active);

-- Vehicles indexes
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_owner_phone ON vehicles(owner_phone);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);

-- Detections indexes
CREATE INDEX idx_detections_camera_id ON detections(camera_id);
CREATE INDEX idx_detections_vehicle_id ON detections(vehicle_id);
CREATE INDEX idx_detections_license_plate ON detections(license_plate);
CREATE INDEX idx_detections_timestamp ON detections(detection_timestamp DESC);
CREATE INDEX idx_detections_confidence ON detections(confidence_score);

-- SMS indexes
CREATE INDEX idx_sms_recipients_phone ON sms_recipients(phone);
CREATE INDEX idx_sms_recipients_is_active ON sms_recipients(is_active);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_delivery_log_message_id ON sms_delivery_log(message_id);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_zones ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Authenticated users can read cameras
CREATE POLICY "Authenticated users can read cameras" ON cameras
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can read vehicles
CREATE POLICY "Authenticated users can read vehicles" ON vehicles
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can read detections
CREATE POLICY "Authenticated users can read detections" ON detections
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

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_recipients_updated_at BEFORE UPDATE ON sms_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_camera_zones_updated_at BEFORE UPDATE ON camera_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, category) VALUES
('detection_confidence_threshold', '0.75', 'Minimum confidence score for valid detections', 'detection'),
('max_sms_per_hour', '100', 'Maximum SMS messages per hour', 'sms'),
('camera_heartbeat_interval', '30', 'Camera heartbeat check interval in seconds', 'camera'),
('auto_cleanup_detections_days', '90', 'Days to keep detection records', 'cleanup'),
('sms_provider', '"twilio"', 'SMS service provider', 'sms'),
('ai_message_model', '"gpt-3.5-turbo"', 'AI model for SMS message generation', 'ai');

-- Insert sample camera data
INSERT INTO cameras (name, location, stream_url, ip_address, status) VALUES
('Main Entrance Camera', 'Building A - Main Gate', 'rtsp://192.168.1.100:554/stream1', '192.168.1.100', 'online'),
('Parking Lot Camera', 'Parking Zone B', 'rtsp://192.168.1.101:554/stream1', '192.168.1.101', 'online'),
('Exit Gate Camera', 'Building A - Exit Gate', 'rtsp://192.168.1.102:554/stream1', '192.168.1.102', 'offline'),
('Side Entrance Camera', 'Building A - Side Gate', 'rtsp://192.168.1.103:554/stream1', '192.168.1.103', 'online');

-- Insert sample SMS recipients
INSERT INTO sms_recipients (name, phone, role, department, notification_types) VALUES
('Security Team', '+1-555-0101', 'Security Officer', 'Security', ARRAY['detection', 'alert', 'system']),
('Manager Office', '+1-555-0102', 'Manager', 'Operations', ARRAY['alert', 'system']),
('Emergency Contact', '+1-555-0103', 'Emergency Response', 'Security', ARRAY['alert']),
('Parking Authority', '+1-555-0104', 'Parking Officer', 'Operations', ARRAY['detection']);
