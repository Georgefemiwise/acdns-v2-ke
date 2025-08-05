// =============================================
// CyberWatch Database Types
// TypeScript definitions for Supabase tables
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      cameras: {
        Row: Camera
        Insert: CameraInsert
        Update: CameraUpdate
      }
      vehicles: {
        Row: Vehicle
        Insert: VehicleInsert
        Update: VehicleUpdate
      }
      detections: {
        Row: Detection
        Insert: DetectionInsert
        Update: DetectionUpdate
      }
      sms_recipients: {
        Row: SmsRecipient
        Insert: SmsRecipientInsert
        Update: SmsRecipientUpdate
      }
      sms_messages: {
        Row: SmsMessage
        Insert: SmsMessageInsert
        Update: SmsMessageUpdate
      }
      sms_delivery_log: {
        Row: SmsDeliveryLog
        Insert: SmsDeliveryLogInsert
        Update: SmsDeliveryLogUpdate
      }
      system_settings: {
        Row: SystemSetting
        Insert: SystemSettingInsert
        Update: SystemSettingUpdate
      }
      activity_logs: {
        Row: ActivityLog
        Insert: ActivityLogInsert
        Update: ActivityLogUpdate
      }
      camera_zones: {
        Row: CameraZone
        Insert: CameraZoneInsert
        Update: CameraZoneUpdate
      }
    }
  }
}

// =============================================
// USER TYPES
// =============================================
export interface User {
  id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  phone?: string
  department?: string
  role: "operator" | "supervisor" | "administrator" | "viewer"
  avatar_url?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id?: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  phone?: string
  department?: string
  role?: "operator" | "supervisor" | "administrator" | "viewer"
  avatar_url?: string
  is_active?: boolean
  last_login?: string
}

export interface UserUpdate {
  email?: string
  password_hash?: string
  first_name?: string
  last_name?: string
  phone?: string
  department?: string
  role?: "operator" | "supervisor" | "administrator" | "viewer"
  avatar_url?: string
  is_active?: boolean
  last_login?: string
}

// =============================================
// CAMERA TYPES
// =============================================
export interface Camera {
  id: string
  name: string
  location: string
  stream_url: string
  rtsp_url?: string
  ip_address?: string
  port: number
  username?: string
  password_encrypted?: string
  status: "online" | "offline" | "maintenance" | "error"
  resolution: string
  fps: number
  is_active: boolean
  last_heartbeat?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CameraInsert {
  id?: string
  name: string
  location: string
  stream_url: string
  rtsp_url?: string
  ip_address?: string
  port?: number
  username?: string
  password_encrypted?: string
  status?: "online" | "offline" | "maintenance" | "error"
  resolution?: string
  fps?: number
  is_active?: boolean
  last_heartbeat?: string
  created_by?: string
}

export interface CameraUpdate {
  name?: string
  location?: string
  stream_url?: string
  rtsp_url?: string
  ip_address?: string
  port?: number
  username?: string
  password_encrypted?: string
  status?: "online" | "offline" | "maintenance" | "error"
  resolution?: string
  fps?: number
  is_active?: boolean
  last_heartbeat?: string
}

// =============================================
// VEHICLE TYPES
// =============================================
export interface Vehicle {
  id: string
  license_plate: string
  make: string
  model: string
  year: number
  color: string
  vehicle_type: string
  owner_name: string
  owner_phone: string
  owner_email: string
  owner_address?: string
  notes?: string
  status: "active" | "inactive" | "blocked" | "expired"
  registration_date?: string
  expiry_date?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface VehicleInsert {
  id?: string
  license_plate: string
  make: string
  model: string
  year: number
  color: string
  vehicle_type?: string
  owner_name: string
  owner_phone: string
  owner_email: string
  owner_address?: string
  notes?: string
  status?: "active" | "inactive" | "blocked" | "expired"
  registration_date?: string
  expiry_date?: string
  created_by?: string
}

export interface VehicleUpdate {
  license_plate?: string
  make?: string
  model?: string
  year?: number
  color?: string
  vehicle_type?: string
  owner_name?: string
  owner_phone?: string
  owner_email?: string
  owner_address?: string
  notes?: string
  status?: "active" | "inactive" | "blocked" | "expired"
  registration_date?: string
  expiry_date?: string
}

// =============================================
// DETECTION TYPES
// =============================================
export interface Detection {
  id: string
  camera_id: string
  vehicle_id?: string
  license_plate: string
  confidence_score: number
  detection_timestamp: string
  image_url?: string
  bounding_box?: BoundingBox
  additional_data?: Record<string, any>
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  created_at: string
}

export interface DetectionInsert {
  id?: string
  camera_id: string
  vehicle_id?: string
  license_plate: string
  confidence_score: number
  detection_timestamp?: string
  image_url?: string
  bounding_box?: BoundingBox
  additional_data?: Record<string, any>
  is_verified?: boolean
  verified_by?: string
  verified_at?: string
}

export interface DetectionUpdate {
  camera_id?: string
  vehicle_id?: string
  license_plate?: string
  confidence_score?: number
  detection_timestamp?: string
  image_url?: string
  bounding_box?: BoundingBox
  additional_data?: Record<string, any>
  is_verified?: boolean
  verified_by?: string
  verified_at?: string
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// =============================================
// SMS TYPES
// =============================================
export interface SmsRecipient {
  id: string
  name: string
  phone: string
  role?: string
  department?: string
  is_active: boolean
  notification_types: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SmsRecipientInsert {
  id?: string
  name: string
  phone: string
  role?: string
  department?: string
  is_active?: boolean
  notification_types?: string[]
  created_by?: string
}

export interface SmsRecipientUpdate {
  name?: string
  phone?: string
  role?: string
  department?: string
  is_active?: boolean
  notification_types?: string[]
}

export interface SmsMessage {
  id: string
  message_content: string
  message_type: string
  recipients_count: number
  status: "pending" | "sent" | "failed" | "partial"
  sent_at?: string
  delivery_status?: Record<string, any>
  related_detection_id?: string
  related_vehicle_id?: string
  sent_by?: string
  created_at: string
}

export interface SmsMessageInsert {
  id?: string
  message_content: string
  message_type?: string
  recipients_count?: number
  status?: "pending" | "sent" | "failed" | "partial"
  sent_at?: string
  delivery_status?: Record<string, any>
  related_detection_id?: string
  related_vehicle_id?: string
  sent_by?: string
}

export interface SmsMessageUpdate {
  message_content?: string
  message_type?: string
  recipients_count?: number
  status?: "pending" | "sent" | "failed" | "partial"
  sent_at?: string
  delivery_status?: Record<string, any>
}

export interface SmsDeliveryLog {
  id: string
  message_id: string
  recipient_id: string
  phone: string
  status: "pending" | "sent" | "delivered" | "failed" | "undelivered"
  provider_message_id?: string
  error_message?: string
  sent_at?: string
  delivered_at?: string
  created_at: string
}

export interface SmsDeliveryLogInsert {
  id?: string
  message_id: string
  recipient_id: string
  phone: string
  status?: "pending" | "sent" | "delivered" | "failed" | "undelivered"
  provider_message_id?: string
  error_message?: string
  sent_at?: string
  delivered_at?: string
}

export interface SmsDeliveryLogUpdate {
  status?: "pending" | "sent" | "delivered" | "failed" | "undelivered"
  provider_message_id?: string
  error_message?: string
  sent_at?: string
  delivered_at?: string
}

// =============================================
// SYSTEM TYPES
// =============================================
export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: any
  description?: string
  category: string
  is_encrypted: boolean
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface SystemSettingInsert {
  id?: string
  setting_key: string
  setting_value: any
  description?: string
  category?: string
  is_encrypted?: boolean
  updated_by?: string
}

export interface SystemSettingUpdate {
  setting_key?: string
  setting_value?: any
  description?: string
  category?: string
  is_encrypted?: boolean
  updated_by?: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface ActivityLogInsert {
  id?: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export interface ActivityLogUpdate {
  action?: string
  resource_type?: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export interface CameraZone {
  id: string
  camera_id: string
  zone_name: string
  zone_type: "detection" | "restricted" | "parking" | "entrance" | "exit"
  coordinates: Coordinate[]
  is_active: boolean
  alert_enabled: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CameraZoneInsert {
  id?: string
  camera_id: string
  zone_name: string
  zone_type?: "detection" | "restricted" | "parking" | "entrance" | "exit"
  coordinates: Coordinate[]
  is_active?: boolean
  alert_enabled?: boolean
  created_by?: string
}

export interface CameraZoneUpdate {
  camera_id?: string
  zone_name?: string
  zone_type?: "detection" | "restricted" | "parking" | "entrance" | "exit"
  coordinates?: Coordinate[]
  is_active?: boolean
  alert_enabled?: boolean
}

export interface Coordinate {
  x: number
  y: number
}

// =============================================
// UTILITY TYPES
// =============================================
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface DatabaseError {
  message: string
  details: string
  hint: string
  code: string
}

// =============================================
// API RESPONSE TYPES
// =============================================
export interface ApiResponse<T> {
  data: T | null
  error: DatabaseError | null
  count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  totalPages: number
}

// =============================================
// DETECTION EVENT TYPES
// =============================================
export interface DetectionEvent {
  detection: Detection
  camera: Camera
  vehicle?: Vehicle
  timestamp: string
}

export interface CameraStatus {
  camera: Camera
  isOnline: boolean
  lastHeartbeat?: string
  activeDetections: number
}

// =============================================
// SMS TEMPLATE TYPES
// =============================================
export interface SmsTemplate {
  id: string
  name: string
  template: string
  placeholders: string[]
  category: string
  is_active: boolean
}

export interface SmsPlaceholders {
  vehicleLicense?: string
  vehicleMake?: string
  vehicleModel?: string
  ownerName?: string
  ownerPhone?: string
  cameraName?: string
  cameraLocation?: string
  detectionTime?: string
  confidenceScore?: string
  systemName?: string
  operatorName?: string
}
