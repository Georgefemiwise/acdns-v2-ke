"use client";

import React, { useEffect, useRef, useState } from "react";

export default function CarDetectionStream() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState("⏳ Connecting...");
  const [detection, setDetection] = useState(null);

  useEffect(() => {
    // 1. Setup webcam
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setStatus("❌ Webcam access denied");
      }
    };

    // 2. Setup WebSocket
    const startWebSocket = () => {
      wsRef.current = new WebSocket("wss://georgefemiwise-acdns.hf.space/ws/stream"); // change to your backend URL
      wsRef.current.binaryType = "arraybuffer";

      wsRef.current.onopen = () => setStatus("✅ Connected to backend");
      wsRef.current.onclose = () => setStatus("🔌 Disconnected");
      wsRef.current.onerror = (err) => {
        console.error("WebSocket error:", err);
        setStatus("⚠️ Connection error");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setDetection(data);
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };
    };

    startCamera();
    startWebSocket();

    // 3. Frame sending loop
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              wsRef.current.send(buffer);
            });
          }
        }, "image/jpeg", 0.8);
      }
    }, 1000); // 1 frame per second

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🚗 Automatic Car Detection</h1>

      {/* Video preview */}
      <div className="relative">
        <video ref={videoRef} autoPlay playsInline className="rounded-xl shadow-lg border w-[640px] h-[480px]" />
        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
      </div>

      {/* Connection status */}
      <p className="mt-4 text-gray-700">{status}</p>

      {/* Detection results */}
      {detection && (
        <div className="mt-6 p-4 bg-white shadow rounded-xl w-[400px] text-center">
          {detection.status === "detected" ? (
            <>
              <p className="text-lg font-semibold text-green-600">✅ Plate Detected</p>
              <p className="text-gray-800">Plate: {detection.plate}</p>
              <p className="text-gray-600">Confidence: {(detection.confidence * 100).toFixed(2)}%</p>
              <p className="text-gray-600">
                Registered: {detection.registered ? "Yes" : "No"}
              </p>
            </>
          ) : (
            <p className="text-gray-500">🔎 No plate detected</p>
          )}
        </div>
      )}
    </div>
  );
}
