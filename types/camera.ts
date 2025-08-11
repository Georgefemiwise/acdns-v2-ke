// =============================================
// Camera Device Types
// TypeScript definitions for camera devices and streams
// =============================================

export interface CameraDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
  groupId: string
}

export interface CameraCapabilities {
  width: ConstrainULongRange
  height: ConstrainULongRange
  frameRate: ConstrainDoubleRange
  facingMode?: string[]
}

export interface CameraConstraints {
  deviceId?: string
  width?: number | ConstrainULongRange
  height?: number | ConstrainULongRange
  frameRate?: number | ConstrainDoubleRange
  facingMode?: string
}

export interface CameraStream {
  stream: MediaStream
  device: CameraDevice
  constraints: CameraConstraints
}

export interface CameraError {
  name: string
  message: string
  constraint?: string
}

export interface CameraPermissionState {
  granted: boolean
  denied: boolean
  prompt: boolean
}

export interface DetectionBoundingBox {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface VehicleDetection {
  id: string
  licensePlate: string
  confidence: number
  boundingBox: DetectionBoundingBox
  timestamp: Date
  cameraId: string
}

// Camera status types
export type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'error' | 'stopped'

export interface CameraState {
  status: CameraStatus
  currentDevice: CameraDevice | null
  availableDevices: CameraDevice[]
  stream: MediaStream | null
  error: CameraError | null
  permissions: CameraPermissionState
}

// Camera selection component props
export interface CameraSelectionProps {
  onCameraSelect: (device: CameraDevice) => void
  onStreamStart: (stream: CameraStream) => void
  onError: (error: CameraError) => void
  selectedDeviceId?: string
  constraints?: CameraConstraints
}

// Camera feed component props
export interface CameraFeedProps {
  stream: MediaStream | null
  onDetection?: (detection: VehicleDetection) => void
  showOverlay?: boolean
  className?: string
}