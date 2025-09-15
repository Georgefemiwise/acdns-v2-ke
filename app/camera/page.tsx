"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { sendDetectionAlert } from "@/lib/sms-service";
import Link from "next/link";
import { ArrowLeft, Camera, RefreshCw } from "lucide-react";
import { useCallback } from "react";

type SeenPlate = { plate: string; timestamp: number };
type VehicleRecord = {
  owner_name?: string;
  owner_phone?: string;
  vehicle_type?: string;
  color?: string;
};
type Detection = {
  plate: string;
  match?: boolean;
  ocr_conf?: number;
  vehicle?: VehicleRecord | null;
  ts: number;
  images?: { raw_crop?: string; processed_crop?: string };
};


// urls
const BASE_URL = "https://georgefemiwise-acdns.hf.space";
const DETECTION_API_URL = `${BASE_URL}/detect`;
const CONNECT_2_DB = `${BASE_URL}/refresh_cache`;



export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [seenPlates, setSeenPlates] = useState<SeenPlate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(
    null
  );
  const selectedCameraIdRef = useRef<string>(selectedCameraId);

  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId;
  }, [selectedCameraId]);

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(CONNECT_2_DB, { method: "GET" });
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


  const loadCameras = useCallback(async () => {
    setError(null);
    try {
      // Request permission and immediately stop the temporary stream so we don't hold default camera open
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // stop immediately to avoid locking the default camera
        tempStream.getTracks().forEach((t) => t.stop());
      } catch (permErr) {
        // If user denies permission, allow enumerateDevices to still run (may return fewer details)
        console.warn(
          "Permission prompt or error during temp getUserMedia:",
          permErr
        );
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length === 0) {
        setError("No cameras found. Please connect a camera and try again.");
        setCameras([]);
        setSelectedCameraId("");
        return;
      }

      setCameras(videoDevices);

      // keep previous selection if still present, otherwise pick first
      const prevId = selectedCameraIdRef.current;
      const stillConnected = videoDevices.some(
        (cam) => cam.deviceId === prevId
      );

      if (stillConnected) {
        // keep it — ensure state stays in sync
        setSelectedCameraId(prevId);
      } else {
        // if nothing selected (first run) or previous disappeared, pick first
        setSelectedCameraId((prev) => prev || videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error("Error loading cameras:", err);
      setError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please grant permission and try again."
          : "Failed to access cameras. Please check permissions or connect a camera."
      );
      setCameras([]);
      setSelectedCameraId("");
    }
  }, []); // no deps because we use selectedCameraIdRef for latest selection

useEffect(() => {
  // initial load
  loadCameras();

  // attach devicechange listener
  navigator.mediaDevices.addEventListener("devicechange", loadCameras);
  return () =>
    navigator.mediaDevices.removeEventListener("devicechange", loadCameras);
}, [loadCameras]);


  // Start or switch camera
  const startCamera = async (cameraId: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("MediaDevices API not supported by your browser.");
      return;
    }

    if (!cameraId) {
      setError("No camera selected. Please choose a camera or connect one.");
      return;
    }

    setIsSwitchingCamera(true);
    setError(null);

    try {
      // Stop existing stream if active
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameraId } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        const selectedCamera = cameras.find((cam) => cam.deviceId === cameraId);
        setActiveCameraLabel(selectedCamera?.label || `Camera ${cameraId}`);
        console.log(
          `✅ Streaming started with camera: ${
            selectedCamera?.label || cameraId
          }`
        );
      }

      if (!intervalId) {
        const id = setInterval(captureAndDetect, 900);
        setIntervalId(id);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Failed to start camera: ";
      if (err.name === "NotAllowedError") {
        errorMessage += "Camera access denied. Please grant permission.";
      } else if (
        err.name === "NotFoundError" ||
        err.message.includes("Could not start video source")
      ) {
        errorMessage +=
          "Selected camera is unavailable. Trying another camera...";
        // Try the next available camera
        const currentIndex = cameras.findIndex(
          (cam) => cam.deviceId === cameraId
        );
        const nextCamera = cameras[(currentIndex + 1) % cameras.length];
        if (nextCamera && nextCamera.deviceId !== cameraId) {
          setSelectedCameraId(nextCamera.deviceId);
          setTimeout(() => startCamera(nextCamera.deviceId), 500); // Retry with next camera
        } else {
          setError("No other cameras available. Please check connections.");
        }
      } else {
        errorMessage += err.message;
      }
      setError(errorMessage);
      // Re-enumerate cameras
      loadCameras();
    } finally {
      setIsSwitchingCamera(false);
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
    setActiveCameraLabel("");
    console.log("🛑 Camera stopped");
  };

  // Handle camera selection change
  const handleCameraChange = (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (isStreaming) {
      startCamera(newCameraId); // Switch camera during streaming
    }
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
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              License Plate Scanner
            </h1>
          </div>
          <Button
            onClick={
              isStreaming ? stopCamera : () => startCamera(selectedCameraId)
            }
            disabled={(!selectedCameraId && !isStreaming) || isSwitchingCamera}
            className={`bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 w-full sm:w-auto px-6 py-2  text-sm sm:text-base font-semibold transition-all ${
              isStreaming
                ? "bg-red-600 hover:bg-red-700"
                : !selectedCameraId || isSwitchingCamera
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            <Camera className="h-5 w-5 mr-2" />
            {isSwitchingCamera
              ? "Switching..."
              : isStreaming
              ? "Stop Stream"
              : "Start Stream"}
          </Button>
        </header>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {/* Video Feed */}
          <div className="relative">
            {isStreaming && (
              <div className="absolute top-3 right-3 flex gap-2 items-center">
                <Badge
                  variant="secondary"
                  className="bg-teal-500 text-white font-semibold px-3 py-1 rounded-full animate-pulse"
                >
                  LIVE
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-gray-700 text-gray-100 font-semibold px-3 py-1 rounded-full"
                >
                  {activeCameraLabel || "Unknown Camera"}
                </Badge>
              </div>
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
            <div className="flex flex-col gap-3 w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-sm sm:text-base font-semibold text-teal-300">
                  Select Camera
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadCameras}
                  className="text-cyan-500 hover:text-cyan-200"
                  disabled={isSwitchingCamera}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>

              {/* the tuggle */}
              <RadioGroup
                value={selectedCameraId}
                onValueChange={(newId) => {
                  handleCameraChange(newId);
                }}
                className="w-full flex flex-col gap-3"
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
                        disabled={isSwitchingCamera}
                      />
                      <Label
                        htmlFor={cam.deviceId}
                        className="text-gray-100 text-sm sm:text-base cursor-pointer capitalize"
                      >
                        {cam.label || `Camera ${idx + 1}`}
                      </Label>
                    </div>
                  ))
                )}
              </RadioGroup>
            </div>
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
                        Confidence: {d.match ?? "—"}
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
