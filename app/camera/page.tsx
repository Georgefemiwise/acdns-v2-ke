"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Play, Square } from "lucide-react";
import { sendDetectionAlert } from "@/lib/sms-service";

type SeenPlate = {
  plate: string;
  timestamp: number; // when it was stored
};

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [result, setResult] = useState<any>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const [seenPlates, setSeenPlates] = useState<SeenPlate[]>([]);

  // ⏳ expiry duration (24 hours in ms)
  const EXPIRY_DURATION = 24 * 60 * 60 * 1000;

  // get list of cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error loading cameras:", err);
      }
    };

    loadCameras();
  }, []);

  // start streaming with selected camera
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: 640,
          height: 480,
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);

      const id = setInterval(captureAndSendFrame, 900); // every 0.9s
      setIntervalId(id);
    } catch (err) {
      console.error("Error starting camera:", err);
    }
  };

  // stop streaming
  const stopStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (intervalId) clearInterval(intervalId);

    setIsStreaming(false);
    setIntervalId(null);
  };

  // capture one frame
  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const res = await fetch(
          "https://georgefemiwise-acdns.hf.space/detect",
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();

        if (data.detections?.length) {
          data.detections.forEach(async (det: any) => {
            const plate = det.text;
            const confidence = det.conf;
            if (!plate) return;

            const now = Date.now();
            const alreadySeen = seenPlates.find(
              (p) => p.plate === plate && now - p.timestamp < EXPIRY_DURATION
            );

            if (!alreadySeen) {
              // send SMS for new plate
              await fetch("/api/send-sms", {
                method: "POST",
                body: JSON.stringify({ plate }),
                headers: { "Content-Type": "application/json" },
              });

              // optional: if you want to use your sms-service helper
              // await sendDetectionAlert([ownerPhone], plate, "Current Location", confidence);

              // add plate with timestamp
              setSeenPlates((prev) => [...prev, { plate, timestamp: now }]);
            }
          });
        }
      } catch (err) {
        console.error("Error sending frame:", err);
      }
    }, "image/jpeg");
  };

  // Load seen plates from storage, cleanup expired ones
  useEffect(() => {
    const saved = localStorage.getItem("seenPlates");
    if (saved) {
      const parsed: SeenPlate[] = JSON.parse(saved);
      const now = Date.now();
      const valid = parsed.filter((p) => now - p.timestamp < EXPIRY_DURATION);
      setSeenPlates(valid);
    }
  }, []);

  // Save plates to storage whenever updated
  useEffect(() => {
    localStorage.setItem("seenPlates", JSON.stringify(seenPlates));
  }, [seenPlates]);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <Card className="bg-gray-900/50 border-cyan-500/30">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-cyan-400 flex items-center">
              <Camera className="mr-2 h-5 w-5" />
              Device Camera Stream
            </CardTitle>
            <Badge
              variant="outline"
              className={
                isStreaming
                  ? "border-green-500 text-green-500"
                  : "border-red-500 text-red-500"
              }
            >
              {isStreaming ? "Streaming" : "Stopped"}
            </Badge>
          </CardHeader>

          <CardContent>
            {/* camera selector */}
            <div className="mb-4 flex items-center space-x-4">
              <Select
                value={selectedCameraId}
                onValueChange={setSelectedCameraId}
                disabled={isStreaming}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select Camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((cam) => (
                    <SelectItem key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
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
                    <Square className="h-4 w-4 mr-2" /> Stop Streaming
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> Start Streaming
                  </>
                )}
              </Button>
            </div>

            {/* video preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-5xl rounded-md border shadow"
            />
            <canvas ref={canvasRef} width={640} height={480} hidden />

            {/* detection result */}
            {result && (
              <div className="mt-4 p-3 bg-gray-800 text-cyan-300 rounded">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
