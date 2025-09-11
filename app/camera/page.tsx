"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendDetectionAlert } from "@/lib/sms-service";

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

const EXPIRY_DURATION = 24 * 60 * 60 * 1000; // 24h
const SEEN_PLATES_KEY = "seenPlates_v1";

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

  // load cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0)
          setSelectedCameraId(videoDevices[0].deviceId);
      } catch (err) {
        console.error("Error loading cameras:", err);
        setError("Unable to load cameras");
      }
    };
    loadCameras();
  }, []);

  // load & persist seenPlates
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_PLATES_KEY);
      if (raw) {
        const parsed: SeenPlate[] = JSON.parse(raw);
        const now = Date.now();
        const valid = parsed.filter((p) => now - p.timestamp < EXPIRY_DURATION);
        setSeenPlates(valid);
      }
    } catch (err) {
      console.error("Failed to load seen plates:", err);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(SEEN_PLATES_KEY, JSON.stringify(seenPlates));
  }, [seenPlates]);

  // start camera
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("MediaDevices API not supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : true,
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
        console.log("✅ Camera preview started");
      }

      if (!intervalId) {
        const id = setInterval(captureAndDetect, 900);
        setIntervalId(id);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(err.message);
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

  // detection pipeline
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
        const res = await fetch(
          "https://georgefemiwise-acdns.hf.space/detect",
          {
            method: "POST",
            body: formData,
          }
        );
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
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">📷 Camera + Detection</h1>

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={selectedCameraId}
          onValueChange={setSelectedCameraId}
          disabled={isStreaming}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select camera" />
          </SelectTrigger>
          <SelectContent>
            {cameras.map((cam, idx) => (
              <SelectItem key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${idx + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          className={isStreaming ? "bg-red-600" : "bg-green-600"}
        >
          {isStreaming ? "Stop" : "Start"}
        </Button>

        <Badge
          variant="outline"
          className={
            isStreaming
              ? "border-green-500 text-green-400"
              : "border-red-500 text-red-400"
          }
        >
          {isStreaming ? "Streaming" : "Stopped"}
        </Badge>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-2xl rounded border border-cyan-500"
      />
      <canvas ref={canvasRef} width={640} height={480} hidden />

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Recent Detections</h2>
        {detections.length === 0 ? (
          <p className="text-gray-400">No detections yet…</p>
        ) : (
          <ul className="space-y-2">
            {detections.map((d) => (
              <li key={d.ts} className="bg-gray-800 p-3 rounded">
                <div className="font-mono">{d.plate}</div>
                <div className="text-xs text-gray-400">
                  Confidence: {d.ocr_conf ?? "—"}
                </div>
                {d.vehicle?.owner_phone && (
                  <div className="text-xs text-green-400">
                    Phone: {d.vehicle.owner_phone}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  );
}
