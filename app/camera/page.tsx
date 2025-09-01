"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

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
          setSelectedDevice(cams[0].deviceId)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex flex-col items-center justify-center p-6">
      <motion.h1
        className="text-3xl font-extrabold text-cyan-400 mb-6 drop-shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Automatic Car Detection System
      </motion.h1>

      {/* Camera Container */}
      <motion.div
        className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-[720px] flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Device Selector */}
        <div className="mb-4 w-full flex justify-between items-center">
          <label className="text-sm text-gray-300">Select Camera:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="text-black px-3 py-2 rounded-lg focus:ring-2 focus:ring-cyan-400"
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
        <div className="mb-6 relative">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-[640px] h-[480px] bg-black rounded-xl shadow-lg border-4 border-cyan-500"
            />
          )}
          {streaming && (
            <div className="absolute top-3 left-3 bg-red-600 text-xs text-white px-2 py-1 rounded-lg shadow">
              LIVE
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-x-4 flex">
          {!streaming ? (
            <button
              onClick={startStream}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2 rounded-xl shadow-lg transition transform hover:scale-105"
            >
              Start Stream
            </button>
          ) : (
            <button
              onClick={stopStream}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-5 py-2 rounded-xl shadow-lg transition transform hover:scale-105"
            >
              Stop Stream
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
