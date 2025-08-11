'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CameraDevice, CameraConstraints, CameraStream, CameraError, CameraState } from '@/types/camera'

export function useCamera() {
  const [cameraState, setCameraState] = useState<CameraState>({
    status: 'idle',
    currentDevice: null,
    availableDevices: [],
    stream: null,
    error: null,
    permissions: {
      granted: false,
      denied: false,
      prompt: true,
    },
  })

  const streamRef = useRef<MediaStream | null>(null)

  // Get available camera devices
  const getAvailableDevices = useCallback(async (): Promise<CameraDevice[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind,
          groupId: device.groupId,
        }))

      setCameraState((prev) => ({
        ...prev,
        availableDevices: videoDevices,
      }))

      return videoDevices
    } catch (error) {
      const cameraError: CameraError = {
        name: 'DeviceEnumerationError',
        message: 'Failed to enumerate camera devices',
      }
      
      setCameraState((prev) => ({
        ...prev,
        error: cameraError,
        status: 'error',
      }))
      
      return []
    }
  }, [])

  // Check camera permissions
  const checkPermissions = useCallback(async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      
      setCameraState((prev) => ({
        ...prev,
        permissions: {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          prompt: permission.state === 'prompt',
        },
      }))

      // Listen for permission changes
      permission.onchange = () => {
        setCameraState((prev) => ({
          ...prev,
          permissions: {
            granted: permission.state === 'granted',
            denied: permission.state === 'denied',
            prompt: permission.state === 'prompt',
          },
        }))
      }
    } catch (error) {
      // Permissions API not supported, try to get devices anyway
      console.warn('Permissions API not supported')
    }
  }, [])

  // Start camera stream
  const startCamera = useCallback(async (
    deviceId?: string,
    constraints: CameraConstraints = {}
  ): Promise<CameraStream | null> => {
    setCameraState((prev) => ({
      ...prev,
      status: 'requesting',
      error: null,
    }))

    try {
      const mediaConstraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: constraints.width || { ideal: 1920 },
          height: constraints.height || { ideal: 1080 },
          frameRate: constraints.frameRate || { ideal: 30 },
          ...constraints,
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      streamRef.current = stream

      // Get the actual device info
      const devices = await getAvailableDevices()
      const currentDevice = devices.find((device) => 
        deviceId ? device.deviceId === deviceId : true
      ) || devices[0]

      if (!currentDevice) {
        throw new Error('No camera device found')
      }

      const cameraStream: CameraStream = {
        stream,
        device: currentDevice,
        constraints: constraints,
      }

      setCameraState((prev) => ({
        ...prev,
        status: 'streaming',
        currentDevice,
        stream,
        error: null,
      }))

      return cameraStream
    } catch (error) {
      const cameraError: CameraError = {
        name: (error as Error).name,
        message: (error as Error).message,
        constraint: (error as OverconstrainedError).constraint,
      }

      setCameraState((prev) => ({
        ...prev,
        status: 'error',
        error: cameraError,
      }))

      return null
    }
  }, [getAvailableDevices])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    setCameraState((prev) => ({
      ...prev,
      status: 'stopped',
      currentDevice: null,
      stream: null,
      error: null,
    }))
  }, [])

  // Switch camera device
  const switchCamera = useCallback(async (deviceId: string, constraints?: CameraConstraints) => {
    stopCamera()
    return await startCamera(deviceId, constraints)
  }, [startCamera, stopCamera])

  // Initialize on mount
  useEffect(() => {
    checkPermissions()
    getAvailableDevices()

    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [checkPermissions, getAvailableDevices, stopCamera])

  return {
    ...cameraState,
    startCamera,
    stopCamera,
    switchCamera,
    getAvailableDevices,
    checkPermissions,
  }
}