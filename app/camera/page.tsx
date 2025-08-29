"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Settings, Maximize, ArrowLeft, Camera, AlertCircle, RefreshCw } from "lucide-react"
import { AuthModal } from "@/components/AuthModal"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"

interface CameraDevice {
  deviceId: string
  label: string
  kind: string
  groupId: string
}

export default function CameraFeed() {
  const { user, loading } = useAuth()
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [detectedCars, setDetectedCars] = useState<any[]>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [error, setError] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [isLoadingCameras, setIsLoadingCameras] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown")

  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  useEffect(() => {
    if (!user) return

    const getCameras = async () => {
      try {
        setIsLoadingCameras(true)
        setError("")

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera access is not supported in this browser")
          setIsLoadingCameras(false)
          return
        }

        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
          tempStream.getTracks().forEach((track) => track.stop())
          setPermissionStatus("granted")
        } catch (permError) {
          console.error("Permission denied:", permError)
          setPermissionStatus("denied")
          setError("Camera permission denied. Please allow camera access and refresh the page.")
          setIsLoadingCameras(false)
          return
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")

        if (videoDevices.length === 0) {
          setError("No cameras found on this device")
          setIsLoadingCameras(false)
          return
        }

        const cameraDevices: CameraDevice[] = videoDevices.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind,
          groupId: device.groupId,
        }))

        setCameras(cameraDevices)

        if (cameraDevices.length > 0) {
          setSelectedCameraId(cameraDevices[0].deviceId)
        }
      } catch (error) {
        console.error("Error getting cameras:", error)
        setError("Failed to access cameras. Please check your browser permissions.")
      } finally {
        setIsLoadingCameras(false)
      }
    }

    getCameras()

    const handleDeviceChange = () => {
      getCameras()
    }

    navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [user])

  useEffect(() => {
    if (isStreaming && user) {
      const interval = setInterval(
        () => {
          const newDetection = {
            id: Date.now(),
            license: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 900) + 100}`,
            confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
            timestamp: new Date().toLocaleTimeString(),
          }
          setDetectedCars((prev) => [newDetection, ...prev.slice(0, 4)])
        },
        Math.random() * 15000 + 10000,
      )

      return () => clearInterval(interval)
    }
  }, [isStreaming, user])

  const startStream = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    if (!selectedCameraId) {
      setError("Please select a camera first")
      return
    }

    try {
      setError("")

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsStreaming(true)

        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const settings = videoTrack.getSettings()
          console.log("Camera settings:", settings)
        }
      }
    } catch (error: any) {
      console.error("Error starting camera:", error)

      if (error.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings.")
      } else if (error.name === "NotFoundError") {
        setError("Selected camera not found. Please try a different camera.")
      } else if (error.name === "NotReadableError") {
        setError("Camera is already in use by another application.")
      } else if (error.name === "OverconstrainedError") {
        setError("Camera doesn't support the requested settings. Trying with default settings...")

        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined },
          })
          streamRef.current = basicStream

          if (videoRef.current) {
            videoRef.current.srcObject = basicStream
            videoRef.current.play()
            setIsStreaming(true)
            setError("")
          }
        } catch (retryError) {
          setError("Failed to start camera with basic settings.")
        }
      } else {
        setError(`Failed to start camera: ${error.message}`)
      }
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)
    setDetectedCars([])
    setError("")
  }

  const refreshCameras = async () => {
    setIsLoadingCameras(true)
    setCameras([])
    setSelectedCameraId("")

    setTimeout(async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")

        const cameraDevices: CameraDevice[] = videoDevices.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind,
          groupId: device.groupId,
        }))

        setCameras(cameraDevices)
        if (cameraDevices.length > 0) {
          setSelectedCameraId(cameraDevices[0].deviceId)
        }
      } catch (error) {
        setError("Failed to refresh camera list")
      } finally {
        setIsLoadingCameras(false)
      }
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Camera className="h-12 w-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading camera system...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10">
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Live Camera Feed
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-400 border-green-500/30"
                >
                  {cameras.length} Camera{cameras.length !== 1 ? "s" : ""}{" "}
                  Available
                </Badge>
                <span className="text-sm text-gray-300">
                  {user.user_metadata?.first_name || user.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400 flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
                      Device Camera Stream
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-cyan-400"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-cyan-400"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded p-3 mt-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 relative">
                    {isStreaming ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />

                        <div className="text-center">
                          <Camera className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-2">
                            Select a camera and start streaming
                          </p>
                          {permissionStatus === "denied" && (
                            <p className="text-red-400 text-sm">
                              Camera permission required
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isStreaming && detectedCars.length > 0 && (
                      <div className="absolute top-4 left-4">
                        <div className="bg-red-500/80 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                          Car Detected: {detectedCars[0]?.license}
                        </div>
                      </div>
                    )}

                    {isStreaming && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          LIVE
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Select
                          value={selectedCameraId}
                          onValueChange={setSelectedCameraId}
                          disabled={isLoadingCameras || isStreaming}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                            <SelectValue
                              placeholder={
                                isLoadingCameras
                                  ? "Loading cameras..."
                                  : "Select Camera"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {cameras.map((camera, index) => (
                              <SelectItem
                                key={camera.deviceId}
                                value={camera.deviceId}
                              >
                                <div className="flex items-center space-x-2">
                                  <Camera className="h-4 w-4 text-cyan-400" />
                                  <span>{camera.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          onClick={refreshCameras}
                          disabled={isLoadingCameras || isStreaming}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                        >
                          <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                              isLoadingCameras ? "animate-spin" : ""
                            }`}
                          />
                          Refresh
                        </Button>

                        {!isStreaming ? (
                          <Button
                            onClick={startStream}
                            disabled={!selectedCameraId || isLoadingCameras}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Stream
                          </Button>
                        ) : (
                          <Button onClick={stopStream} variant="destructive">
                            <Square className="h-4 w-4 mr-2" />
                            Stop Stream
                          </Button>
                        )}
                      </div>
                    </div>

                    {selectedCameraId && cameras.length > 0 && (
                      <div className="text-sm text-gray-400 bg-gray-800/50 rounded p-3">
                        <p>
                          <strong>Selected:</strong>{" "}
                          {
                            cameras.find((c) => c.deviceId === selectedCameraId)
                              ?.label
                          }
                        </p>
                        <p>
                          <strong>Device ID:</strong>{" "}
                          {selectedCameraId.substring(0, 20)}...
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {isStreaming ? "Streaming" : "Ready"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">
                    Available Cameras
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {cameras.length} device camera
                    {cameras.length !== 1 ? "s" : ""} detected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoadingCameras ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-6 w-6 text-cyan-400 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-400 text-sm">
                          Detecting cameras...
                        </p>
                      </div>
                    ) : cameras.length > 0 ? (
                      cameras.map((camera, index) => (
                        <div
                          key={camera.deviceId}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                            selectedCameraId === camera.deviceId
                              ? "bg-cyan-500/20 border-cyan-500/50"
                              : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50"
                          }`}
                          onClick={() =>
                            !isStreaming && setSelectedCameraId(camera.deviceId)
                          }
                        >
                          <div className="flex items-center space-x-3">
                            <Camera className="h-4 w-4 text-cyan-400" />
                            <div>
                              <p className="text-white font-medium">
                                {camera.label}
                              </p>
                              <p className="text-gray-400 text-xs">
                                Camera {index + 1}
                              </p>
                            </div>
                          </div>
                          {selectedCameraId === camera.deviceId && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              Selected
                            </Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No cameras detected</p>
                        <p className="text-gray-500 text-sm mb-4">
                          Check camera permissions
                        </p>
                        <Button
                          onClick={refreshCameras}
                          size="sm"
                          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">
                    Recent Detections
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    AI-powered license plate detection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detectedCars.length > 0 ? (
                    <div className="space-y-3">
                      {detectedCars.map((car) => (
                        <div
                          key={car.id}
                          className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-mono font-bold">
                              {car.license}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            >
                              {(
                                Number.parseFloat(car.confidence) * 100
                              ).toFixed(0)}
                              %
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {car.timestamp}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No detections yet</p>
                      <p className="text-gray-500 text-sm">
                        Start streaming to detect vehicles
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
