"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Settings,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CameraIcon,
} from "lucide-react";

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
  groupId: string;
}

export default function CameraFeed() {
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const cameraDevices: CameraDevice[] = videoDevices.map(
          (device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
            kind: device.kind,
            groupId: device.groupId,
          })
        );
        setCameras(cameraDevices);
        if (cameraDevices.length > 0) {
          setSelectedCameraId(cameraDevices[0].deviceId);
        }
      } catch {
        setError("Failed to load cameras");
      }
    };
    getCameras();
  }, []);

  // Take one snapshot
  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageData = canvasRef.current.toDataURL("image/jpeg");

    try {
      setConnectionStatus("connecting");
      const res = await fetch("https://YOUR-HF-SPACE.hf.space/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await res.json();
      console.log("Snapshot result:", result);
      setConnectionStatus("connected");
    } catch (err) {
      console.error("Snapshot error:", err);
      setConnectionStatus("disconnected");
    }
  };

  // Capture + send frame (for streaming mode)
  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const imageData = canvasRef.current.toDataURL("image/jpeg");

    try {
      const res = await fetch("https://YOUR-HF-SPACE.hf.space/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const result = await res.json();
      console.log("Streaming result:", result);
    } catch (err) {
      console.error("Streaming error:", err);
    }
  };

  // Start streaming
  const startStream = async () => {
    if (!selectedCameraId) {
      setError("Select a camera first");
      return;
    }

    try {
      setError("");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      intervalRef.current = setInterval(captureAndSendFrame, 900);
      setIsStreaming(true);
    } catch (err) {
      console.error("Error starting stream:", err);
      setError("Failed to start stream");
    }
  };

  // Stop streaming
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-cyan-400 flex items-center">
                <Camera className="mr-2 h-5 w-5" />
                Device Camera Stream
              </CardTitle>

              <Badge
                variant="outline"
                className={
                  connectionStatus === "connected"
                    ? "border-green-500 text-green-500"
                    : connectionStatus === "connecting"
                    ? "border-yellow-500 text-yellow-500"
                    : "border-red-500 text-red-500"
                }
              >
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            <div className="mb-4 flex items-center space-x-4">
              <Select
                value={selectedCameraId}
                onValueChange={setSelectedCameraId}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((cam) => (
                    <SelectItem key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={isStreaming ? stopStream : startStream}
                className={
                  isStreaming
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {isStreaming ? (
                  <>
                    <Square className="h-4 w-4 mr-2" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Start Stream
                  </>
                )}
              </Button>

              <Button
                onClick={takeSnapshot}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CameraIcon className="h-4 w-4 mr-2" /> Snapshot
              </Button>

              <Button variant="ghost" size="sm" onClick={stopStream}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl rounded-md border shadow"
            />
            <canvas ref={canvasRef} width={640} height={480} hidden />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
