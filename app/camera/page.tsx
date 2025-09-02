"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CarDetectionStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();

  // Hugging Face WebSocket URL
  const WS_URL = "wss://georgefemiwise.acdns.hf.space/stream";

  // Load video devices
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

  // Open webcam and WebSocket, start streaming frames
  const startStream = async () => {
    try {
      if (stream) stopStream();

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined },
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Open WebSocket connection
      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsStreaming(true);
        sendFrames(ws);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsStreaming(false);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        setIsStreaming(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Error starting stream:", err);
    }
  };

  // Stop webcam and close WebSocket
  const stopStream = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Function to continuously capture and send frames over WebSocket
  const sendFrames = (ws: WebSocket) => {
    const sendFrame = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const reader = new FileReader();
        reader.onload = () => {
          if (ws.readyState === WebSocket.OPEN && reader.result instanceof ArrayBuffer) {
            ws.send(reader.result);
          }
        };
        reader.readAsArrayBuffer(blob);
      }, "image/jpeg");

      // Schedule next frame capture
      if (isStreaming) {
        setTimeout(sendFrame, 300); // every 300ms (adjust as needed)
      }
    };

    sendFrame();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white space-y-6">
      <h1 className="text-2xl font-bold">🎥 Car Detection Stream (WebSocket)</h1>

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
          disabled={isStreaming}
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
            disabled={isStreaming}
            className="px-6 py-2 rounded-xl bg-green-600 hover:bg-green-500 shadow-lg disabled:opacity-50"
          >
            ▶️ Start Stream
          </button>
          <button
            onClick={stopStream}
            disabled={!isStreaming}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg disabled:opacity-50"
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
