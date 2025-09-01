"use client"

import { useEffect, useRef, useState } from "react"

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>("")
  const [error, setError] = useState("")
  const [streaming, setStreaming] = useState(false)

  // ✅ Fetch available video input devices (cameras)
  useEffect(() => {
    async function loadDevices() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const cams = allDevices.filter((d) => d.kind === "videoinput")
        setDevices(cams)

        if (cams.length > 0) {
          setSelectedDevice(cams[0].deviceId) // pick first by default
        }
      } catch (err) {
        console.error("Device error:", err)
        setError("Could not load camera devices.")
      }
    }

    loadDevices()
  }, [])

  // ✅ Start webcam feed
  const startStream = async () => {
    try {
      if (!selectedDevice) {
        setError("No camera selected.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDevice } },
        audio: false,
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setStreaming(true)
      setError("")
    } catch (err) {
      console.error("Camera error:", err)
      setError("Could not access webcam. Please allow permissions.")
    }
  }

  // ✅ Stop webcam feed
  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setStreaming(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-cyan-400 mb-6">Automatic Car Detection System - Camera Feed</h1>

      {/* Device Selector */}
      <div className="mb-4">
        <label className="mr-2">Select Camera:</label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="text-black px-2 py-1 rounded"
        >
          {devices.length > 0 ? (
            devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1}`}
              </option>
            ))
          ) : (
            <option>No cameras found</option>
          )}
        </select>
      </div>

      {/* Video Feed */}
      <div className="mb-6">
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-[640px] h-[480px] bg-black rounded-lg shadow-lg border-4 border-white"
          />
        )}
      </div>

      {/* Controls */}
      <div className="space-x-4">
        {!streaming ? (
          <button
            onClick={startStream}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Start Stream
          </button>
        ) : (
          <button
            onClick={stopStream}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Stop Stream
          </button>
        )}
      </div>
    </div>
  )
}
