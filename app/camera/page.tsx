"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { sendDetectionAlert } from "@/lib/sms-service";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";

type SeenPlate = { plate: string; timestamp: number };
type VehicleRecord = {
  owner_name?: string;
  owner_phone?: string;
  vehicle_type?: string;
  color?: string;
};
type Detection = {
  plate: string;
  ocr_conf?: number;
  vehicle?: VehicleRecord | null;
  ts: number;
  images?: { raw_crop?: string; processed_crop?: string };
};

const DETECTION_API_URL = "https://georgefemiwise-acdns.hf.space/detect";

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [seenPlates, setSeenPlates] = useState<SeenPlate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(
    null
  );

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(DETECTION_API_URL, { method: "GET" });
        setIsBackendConnected(response.ok);
        console.log(
          `✅ Backend connection status: ${
            response.ok ? "Connected" : "Disconnected"
          }`
        );
      } catch (err) {
        setIsBackendConnected(false);
        console.error("❌ Backend connection failed:", err);
      }
    };
    checkBackend();
  }, []);

  // Load all available cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        // Request permission to access cameras to ensure all are enumerated
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length === 0) {
          setError("No cameras found. Please connect a camera and try again.");
        } else {
          setCameras(videoDevices);
          setSelectedCameraId(videoDevices[0].deviceId); // Default to first camera
          console.log(
            `✅ Found ${videoDevices.length} camera(s):`,
            videoDevices.map((d) => d.label || `Camera ${d.deviceId}`)
          );
        }
      } catch (err) {
        console.error("Error loading cameras:", err);
        setError(
          "Failed to access cameras. Please check permissions or connect a camera."
        );
      }
    };
    loadCameras();
  }, []);

  // Start camera with selected camera ID
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("MediaDevices API not supported by your browser.");
      return;
    }

    if (!selectedCameraId) {
      setError("No camera selected. Please choose a camera.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCameraId } },
        audio: false,
      });

      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream)
            .getTracks()
            .forEach((t) => t.stop());
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        console.log(`✅ Streaming started with camera: ${selectedCameraId}`);
      }

      if (!intervalId) {
        const id = setInterval(captureAndDetect, 900);
        setIntervalId(id);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(
        `Failed to start camera: ${err.message}. Please ensure the selected camera is available.`
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    setIsStreaming(false);
    console.log("🛑 Camera stopped");
  };

  // Detection pipeline
  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      try {
        const res = await fetch(DETECTION_API_URL, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data?.detections) return;

        for (const det of data.detections) {
          const plate = det.plate;
          if (!plate) continue;

          const detection: Detection = {
            plate,
            ocr_conf: det.ocr_conf,
            vehicle: det.vehicle ?? null,
            ts: Date.now(),
            images: {
              raw_crop: det.images?.raw_crop,
              processed_crop: det.images?.processed_crop,
            },
          };

          setDetections((prev) => [detection, ...prev].slice(0, 50));

          if (!seenPlates.some((p) => p.plate === plate)) {
            if (detection.vehicle?.owner_phone) {
              try {
                await sendDetectionAlert(
                  [detection.vehicle.owner_phone],
                  plate,
                  "Live Location",
                  detection.ocr_conf ?? 0
                );
                console.log(`SMS sent for plate: ${plate}`);
              } catch (err) {
                console.error("SMS failed:", err);
              }
            }
            setSeenPlates((prev) => [
              ...prev,
              { plate, timestamp: Date.now() },
            ]);
          }
        }
      } catch (err) {
        console.error("Detection failed:", err);
      }
    }, "image/jpeg");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-900/80 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              License Plate Scanner
            </h1>
          </div>
          <Button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 w-full sm:w-auto px-6 py-2  text-sm sm:text-base font-semibold transition-all ${
              isStreaming
                ? "bg-red-600 hover:bg-red-700"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            <Camera className="h-5 w-5 mr-2" />
            {isStreaming ? "Stop Stream" : "Start Stream"}
          </Button>
        </header>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {/* Video Feed */}
          <div className="relative">
            {isStreaming && (
              <Badge
                variant="secondary"
                className="absolute top-3 right-3 bg-teal-500 text-white font-semibold px-3 py-1 rounded-full animate-pulse"
              >
                LIVE
              </Badge>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg border border-teal-500/30 shadow-md max-w-[90vw] sm:max-w-[600px]"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <RadioGroup
              value={selectedCameraId}
              onValueChange={setSelectedCameraId}
              disabled={isStreaming}
              className="w-full sm:w-auto flex flex-col gap-3"
            >
              {cameras.length === 0 ? (
                <p className="text-gray-400 text-sm sm:text-base">
                  No cameras detected. Please connect a camera.
                </p>
              ) : (
                cameras.map((cam, idx) => (
                  <div key={cam.deviceId} className="flex items-center gap-3">
                    <RadioGroupItem
                      value={cam.deviceId}
                      id={cam.deviceId}
                      className="border-teal-500 text-teal-500"
                    />
                    <Label
                      htmlFor={cam.deviceId}
                      className="text-gray-100 text-sm sm:text-base cursor-pointer"
                    >
                      {cam.label || `Camera ${idx + 1}`}
                    </Label>
                  </div>
                ))
              )}
            </RadioGroup>
            <Badge
              variant="outline"
              className={`w-fit px-3 py-1 text-sm font-semibold rounded-full ${
                isBackendConnected === null
                  ? "text-yellow-400 border-yellow-400"
                  : isBackendConnected
                  ? "text-teal-400 border-teal-400"
                  : "text-red-400 border-red-400"
              }`}
            >
              {isBackendConnected === null
                ? "Checking..."
                : isBackendConnected
                ? "Connected"
                : "Disconnected"}
            </Badge>
          </div>

          <canvas ref={canvasRef} width={640} height={480} className="hidden" />

          {/* Detections */}
          <div className="bg-gray-900/50 p-4 rounded-xl shadow-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-teal-300 mb-3">
              Recent Detections
            </h2>
            {detections.length === 0 ? (
              <p className="text-gray-400 italic text-sm sm:text-base">
                No detections yet...
              </p>
            ) : (
              <ul className="space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {detections.map((d) => (
                  <li
                    key={d.ts}
                    className="bg-gray-800/70 p-3 rounded-lg border border-teal-500/20 hover:border-teal-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono bg-teal-600 text-white px-3 py-1">
                        {d.plate}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Confidence: {d.ocr_conf ?? "—"}
                      </span>
                    </div>
                    {d.vehicle?.owner_phone && (
                      <div className="text-xs text-teal-400 mt-1">
                        Phone: {d.vehicle.owner_phone}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
