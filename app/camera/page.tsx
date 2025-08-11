"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Square, Settings, Maximize, ArrowLeft, Camera } from 'lucide-react'
import { AuthModal } from "@/components/AuthModal"
import { CameraSelector } from "@/components/CameraSelector"
import { useAuth } from "@/contexts/AuthContext"
import { supabase, subscribeToTable } from "@/lib/supabase"
import type { Database } from "@/types/database"
import type { CameraDevice, VehicleDetection } from "@/types/camera"
import Link from "next/link"

type DatabaseCamera = Database['public']['Tables']['cameras']['Row']
type DatabaseDetection = Database['public']['Tables']['detections']['Row']

export default function CameraFeed() {
  const { user, loading } = useAuth()
  const [isStreaming, setIsStreaming] = useState(false)
  const [detectedCars, setDetectedCars] = useState<VehicleDetection[]>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentCameraDevice, setCurrentCameraDevice] = useState<CameraDevice | null>(null)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const [cameras, setCameras] = useState<DatabaseCamera[]>([])
  const [isLoadingCameras, setIsLoadingCameras] = useState(true)

  // Check authentication on mount
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  // Fetch cameras from Supabase
  useEffect(() => {
    if (!user) return

    const fetchCameras = async () => {
      try {
        const { data, error } = await supabase
          .from('cameras')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (error) {
          console.error('Failed to fetch cameras:', error)
          setError('Failed to load cameras')
        } else {
          setCameras(data || [])
        }
        setIsLoadingCameras(false)
      } catch (error) {
        console.error("Failed to fetch cameras:", error)
        setError('Failed to load cameras')
        setIsLoadingCameras(false)
      }
    }

    fetchCameras()

    // Set up real-time camera updates
    const unsubscribe = subscribeToTable<DatabaseCamera>(
      'cameras',
      (payload) => {
        setCameras((prev) => {
          const updated = [...prev]
          const index = updated.findIndex((cam) => cam.id === payload.new.id)
          if (index >= 0) {
            updated[index] = payload.new as DatabaseCamera
          } else {
            updated.push(payload.new as DatabaseCamera)
          }
          return updated
        })
      }
    )

    return unsubscribe
  }, [user])

  // Set up real-time detection updates
  useEffect(() => {
    if (!user || !isStreaming) return

    const unsubscribe = subscribeToTable<DatabaseDetection>(
      'detections',
      (payload) => {
        const detection = payload.new as DatabaseDetection
        const vehicleDetection: VehicleDetection = {
          id: detection.id,
          licensePlate: detection.license_plate,
          confidence: detection.confidence_score,
          boundingBox: detection.bounding_box as VehicleDetection['boundingBox'] || {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            confidence: detection.confidence_score,
          },
          timestamp: new Date(detection.detection_timestamp),
          cameraId: detection.camera_id,
        }
        
        setDetectedCars((prev) => [vehicleDetection, ...prev.slice(0, 4)])
      }
    )

    return unsubscribe
  }, [user, isStreaming])

  // Handle camera start
  const handleCameraStart = (stream: MediaStream, device: CameraDevice) => {
    setCurrentStream(stream)
    setCurrentCameraDevice(device)
    setIsStreaming(true)
    setError('')

    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }

  // Handle camera error
  const handleCameraError = (errorMessage: string) => {
    setError(errorMessage)
    setIsStreaming(false)
  }

  // Stop camera stream
  const stopStream = () => {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop())
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setCurrentStream(null)
    setCurrentCameraDevice(null)
    setIsStreaming(false)
    setDetectedCars([])
  }

  // Simulate vehicle detection (replace with actual AI detection)
  useEffect(() => {
    if (!isStreaming || !currentCameraDevice) return

    const interval = setInterval(() => {
      // Simulate detection
      const mockDetection: VehicleDetection = {
        id: `detection_${Date.now()}`,
        licensePlate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 900) + 100}`,
        confidence: Math.random() * 0.3 + 0.7,
        boundingBox: {
          x: Math.random() * 200,
          y: Math.random() * 200,
          width: 100 + Math.random() * 100,
          height: 50 + Math.random() * 50,
          confidence: Math.random() * 0.3 + 0.7,
        },
        timestamp: new Date(),
        cameraId: currentCameraDevice.deviceId,
      }
      
      setDetectedCars((prev) => [mockDetection, ...prev.slice(0, 4)])
    }, Math.random() * 10000 + 5000)

    return () => clearInterval(interval)
  }, [isStreaming, currentCameraDevice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [currentStream])

  // Mock function to simulate saving detection to database
  const saveDetection = async (detection: VehicleDetection) => {
    try {
      const { error } = await supabase
        .from('detections')
        .insert({
          camera_id: detection.cameraId,
          license_plate: detection.licensePlate,
          confidence_score: detection.confidence,
          detection_timestamp: detection.timestamp.toISOString(),
          bounding_box: detection.boundingBox,
        })

      if (error) {
        console.error('Failed to save detection:', error)
      }
    } catch (error) {
      console.error('Failed to save detection:', error)
    }
  }

  // Handle detection save
  const handleDetectionSave = (detection: VehicleDetection) => {
    saveDetection(detection)
  }

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
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Live Camera Feed
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {cameras.filter((c) => c.status === "online").length} Cameras Online
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
            {/* Main Video Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Camera Selector */}
              <CameraSelector
                onCameraStart={handleCameraStart}
                onError={handleCameraError}
              />

              {/* Video Feed */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400 flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
                      Video Stream
                      {currentCameraDevice && (
                        <span className="ml-2 text-sm text-gray-400">
                          ({currentCameraDevice.label})
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                        <div className="text-center">
                          <Camera className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">Select a camera and start streaming</p>
                          {error && (
                            <p className="text-red-400 text-sm mt-2">{error}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Detection Overlay */}
                    {isStreaming && detectedCars.length > 0 && (
                      <div className="absolute top-4 left-4">
                        <div className="bg-red-500/80 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                          Car Detected: {detectedCars[0]?.licensePlate}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stream Controls */}
                  {isStreaming && (
                    <div className="mt-4 flex justify-center">
                      <Button onClick={stopStream} variant="destructive">
                        <Square className="h-4 w-4 mr-2" />
                        Stop Stream
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Camera Status */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Camera Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCameras ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Loading cameras...</p>
                    </div>
                  ) : cameras.length > 0 ? (
                    <div className="space-y-3">
                      {cameras.map((camera) => (
                        <div key={camera.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                          <div>
                            <p className="text-white font-medium">{camera.name}</p>
                            <p className="text-gray-400 text-sm">{camera.location}</p>
                          </div>
                          <Badge
                            variant={camera.status === "online" ? "default" : "destructive"}
                            className={
                              camera.status === "online" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                            }
                          >
                            {camera.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Camera className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">No cameras configured</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Detections */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Recent Detections</CardTitle>
                  <CardDescription className="text-gray-400">Latest car detections from active cameras</CardDescription>
                </CardHeader>
                <CardContent>
                  {detectedCars.length > 0 ? (
                    <div className="space-y-3">
                      {detectedCars.map((car) => (
                        <div key={car.id} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-mono font-bold">{car.licensePlate}</span>
                            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              {(car.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">{car.timestamp.toLocaleTimeString()}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => handleDetectionSave(car)}
                          >
                            Save Detection
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No detections yet</p>
                      <p className="text-gray-500 text-sm">Start streaming to see detected vehicles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
      )

      return () => clearInterval(interval)
    }
  }, [isStreaming, user])

  const startStream = async () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    if (!selectedCamera) return

    const camera = cameras.find((c) => c.id === selectedCamera)
    if (!camera) return

    try {
      let stream: MediaStream

      if (camera.stream_url.startsWith("rtsp://")) {
        // For RTSP streams, we'd typically use a WebRTC gateway
        // For demo purposes, we'll use getUserMedia
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
        })
      } else if (camera.stream_url.startsWith("http://") || camera.stream_url.startsWith("https://")) {
        // For HTTP streams, we'd set the video src directly
        if (videoRef.current) {
          videoRef.current.src = camera.stream_url
          setIsStreaming(true)
          return
        }
      } else {
        // Default to getUserMedia for demo
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)

        // Update camera status to indicate active streaming
        setCameras((prev) =>
          prev.map((c) => (c.id === selectedCamera ? { ...c, last_heartbeat: new Date().toISOString() } : c)),
        )
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      // Show user-friendly error message
      alert(`Failed to connect to camera: ${camera.name}. Please check camera status.`)
    }
  }

  const stopStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
    setDetectedCars([])
  }

  // Add camera health check
  useEffect(() => {
    if (!isStreaming || !selectedCamera || !user) return

    const healthCheck = setInterval(() => {
      const camera = cameras.find((c) => c.id === selectedCamera)
      if (camera && camera.status === "offline") {
        stopStream()
        alert(`Camera ${camera.name} went offline. Stream stopped.`)
      }
    }, 5000)

    return () => clearInterval(healthCheck)
  }, [isStreaming, selectedCamera, cameras, user])

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
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Live Camera Feed
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {cameras.filter((c) => c.status === "online").length} Cameras Online
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
            {/* Main Video Feed */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-cyan-400 flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
                      Video Stream
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 relative">
                    {isStreaming ? (
                      <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Camera className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">Select a camera and start streaming</p>
                        </div>
                      </div>
                    )}

                    {/* Detection Overlay */}
                    {isStreaming && detectedCars.length > 0 && (
                      <div className="absolute top-4 left-4">
                        <div className="bg-red-500/80 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                          Car Detected: {detectedCars[0]?.license}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select Camera" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {cameras.map((camera) => (
                            <SelectItem key={camera.id} value={camera.id} disabled={camera.status === "offline"}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-2 h-2 rounded-full ${camera.status === "online" ? "bg-green-400" : "bg-red-400"}`}
                                  />
                                  <span>
                                    {camera.name} - {camera.location}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 ml-2">{camera.ip_address}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex space-x-2">
                        {!isStreaming ? (
                          <Button
                            onClick={startStream}
                            disabled={!selectedCamera}
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Camera Status */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Camera Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cameras.map((camera) => (
                      <div key={camera.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div>
                          <p className="text-white font-medium">{camera.name}</p>
                          <p className="text-gray-400 text-sm">{camera.location}</p>
                        </div>
                        <Badge
                          variant={camera.status === "online" ? "default" : "destructive"}
                          className={
                            camera.status === "online" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                          }
                        >
                          {camera.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Detections */}
              <Card className="bg-gray-900/50 border-cyan-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Recent Detections</CardTitle>
                  <CardDescription className="text-gray-400">Latest car detections from active cameras</CardDescription>
                </CardHeader>
                <CardContent>
                  {detectedCars.length > 0 ? (
                    <div className="space-y-3">
                      {detectedCars.map((car) => (
                        <div key={car.id} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-mono font-bold">{car.license}</span>
                            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              {(Number.parseFloat(car.confidence) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">{car.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No detections yet</p>
                      <p className="text-gray-500 text-sm">Start streaming to see detected vehicles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
