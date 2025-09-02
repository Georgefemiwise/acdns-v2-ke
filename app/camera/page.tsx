"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CarDetectionStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamingInterval, setStreamingInterval] = useState<number | null>(null);
  const router = useRouter();

  const API_URL = "https://your-huggingface-space-url.hf.space/predict"; // <-- replace with your actual URL

  // Load available video devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error loading devices:", err);
      }
    }
    loadDevices();
  }, []);

  // Start webcam stream and begin frame capture
  const startStream = async () => {
    try {
      if (stream) {
        stopStream();
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined },
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Start sending frames every 300ms
     const interval = window.setInterval(sendFrameToBackend, 300);
setStreamingInterval(interval);

    } catch (err) {
      console.error("Error starting stream:", err);
    }
  };

  // Stop webcam stream and frame sending
  const stopStream = () => {
    if (streamingInterval) {
      clearInterval(streamingInterval);
      setStreamingInterval(null);
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture current video frame and send it to backend
  const sendFrameToBackend = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert frame to blob (or base64 if you prefer)
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error("Failed to send frame:", await res.text());
        } else {
          const result = await res.json();
          console.log("Prediction result:", result);
        }
      } catch (error) {
        console.error("Error sending frame:", error);
      }
    }, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white space-y-6">
      <h1 className="text-2xl font-bold">🎥 Car Detection Stream</h1>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Video Preview */}
      <div className="relative w-[640px] h-[480px] bg-black rounded-2xl shadow-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Camera Select */}
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600"
        >
          {devices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>

        {/* Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={startStream}
            className="px-6 py-2 rounded-xl bg-green-600 hover:bg-green-500 shadow-lg"
          >
            ▶️ Start Stream
          </button>
          <button
            onClick={stopStream}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg"
          >
            ⏹️ Stop Stream
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 shadow-lg"
          >
            ⬅️ Back
          </button>
        </div>
      </div>
    </div>
  );
}
