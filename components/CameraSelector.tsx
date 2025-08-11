'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Camera, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import type { CameraDevice, CameraConstraints } from '@/types/camera'

interface CameraSelectorProps {
  onCameraStart: (stream: MediaStream, device: CameraDevice) => void
  onError: (error: string) => void
  className?: string
}

export function CameraSelector({ onCameraStart, onError, className }: CameraSelectorProps) {
  const {
    status,
    availableDevices,
    currentDevice,
    stream,
    error,
    permissions,
    startCamera,
    stopCamera,
    switchCamera,
    getAvailableDevices,
  } = useCamera()

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [constraints, setConstraints] = useState<CameraConstraints>({
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  })

  // Update selected device when devices are loaded
  useEffect(() => {
    if (availableDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(availableDevices[0].deviceId)
    }
  }, [availableDevices, selectedDeviceId])

  // Handle camera start
  const handleStartCamera = async () => {
    if (!selectedDeviceId) {
      onError('Please select a camera device')
      return
    }

    const cameraStream = await startCamera(selectedDeviceId, constraints)
    if (cameraStream) {
      onCameraStart(cameraStream.stream, cameraStream.device)
    } else if (error) {
      onError(error.message)
    }
  }

  // Handle camera switch
  const handleSwitchCamera = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    if (status === 'streaming') {
      const cameraStream = await switchCamera(deviceId, constraints)
      if (cameraStream) {
        onCameraStart(cameraStream.stream, cameraStream.device)
      } else if (error) {
        onError(error.message)
      }
    }
  }

  // Handle permission request
  const handleRequestPermission = async () => {
    await getAvailableDevices()
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'streaming':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Streaming
          </Badge>
        )
      case 'requesting':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Idle
          </Badge>
        )
    }
  }

  return (
    <Card className={`bg-gray-900/50 border-cyan-500/30 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-cyan-400 flex items-center">
            <Camera className="mr-2 h-5 w-5" />
            Camera Selection
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-gray-400">
          Select and configure your camera device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permissions.denied && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Camera permission denied</span>
            </div>
            <p className="text-xs text-red-300 mt-1">
              Please enable camera access in your browser settings
            </p>
          </div>
        )}

        {permissions.prompt && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Camera permission required</span>
              </div>
              <Button
                size="sm"
                onClick={handleRequestPermission}
                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/50"
              >
                Grant Access
              </Button>
            </div>
          </div>
        )}

        {/* Device Selection */}
        {availableDevices.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Camera Device</label>
            <Select value={selectedDeviceId} onValueChange={handleSwitchCamera}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a camera" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {availableDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    <div className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-cyan-400" />
                      <span>{device.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Resolution Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Resolution</label>
            <Select
              value={`${constraints.width?.ideal || 1920}x${constraints.height?.ideal || 1080}`}
              onValueChange={(value) => {
                const [width, height] = value.split('x').map(Number)
                setConstraints((prev) => ({
                  ...prev,
                  width: { ideal: width },
                  height: { ideal: height },
                }))
              }}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                <SelectItem value="640x480">640x480 (VGA)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Frame Rate</label>
            <Select
              value={String(constraints.frameRate?.ideal || 30)}
              onValueChange={(value) => {
                setConstraints((prev) => ({
                  ...prev,
                  frameRate: { ideal: Number(value) },
                }))
              }}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="60">60 FPS</SelectItem>
                <SelectItem value="30">30 FPS</SelectItem>
                <SelectItem value="15">15 FPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{error.name}</span>
            </div>
            <p className="text-xs text-red-300 mt-1">{error.message}</p>
          </div>
        )}

        {/* Current Device Info */}
        {currentDevice && status === 'streaming' && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Active Camera</span>
            </div>
            <p className="text-xs text-green-300 mt-1">{currentDevice.label}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {status !== 'streaming' ? (
            <Button
              onClick={handleStartCamera}
              disabled={!selectedDeviceId || status === 'requesting' || permissions.denied}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {status === 'requesting' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              variant="destructive"
              className="flex-1"
            >
              Stop Camera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}