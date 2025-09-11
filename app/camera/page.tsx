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
import { ArrowLeft, Camera, Play, Square, Trash } from "lucide-react";
import { sendDetectionAlert } from "@/lib/sms-service";
import Link from "next/link";

type SeenPlate = {
  plate: string;
  timestamp: number; // ms since epoch
};

type VehicleRecord = {
  id?: string;
  license_plate?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  vehicle_type?: string;
  color?: string;
  [key: string]: any;
};

type Detection = {
  plate: string;
  ocr_conf?: number;
  bbox?: number[];
  vehicle?: VehicleRecord | null;
  images?: {
    raw_crop?: string; // base64
    processed_crop?: string; // base64
  };
  ts: number;
};

const EXPIRY_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SEEN_PLATES_KEY = "seenPlates_v1";

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const [seenPlates, setSeenPlates] = useState<SeenPlate[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);

  // new: permission & video readiness states
  const [permissionStatus, setPermissionStatus] = useState<
    "unknown" | "granted" | "denied" | "unsupported"
  >("unknown");
  const [videoReady, setVideoReady] = useState(false);

  // Load available cameras. If labels are empty, request a quick permission to reveal labels (then stop).
  useEffect(() => {
    const loadCameras = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn("MediaDevices API not available");
        setPermissionStatus("unsupported");
        return;
      }

      try {
        // Try to enumerate first (may have empty labels if no permission yet)
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoDevices = devices.filter((d) => d.kind === "videoinput");

        // If labels are missing, request temporary permission to reveal labels
        const needLabels =
          videoDevices.length > 0 && videoDevices.every((d) => !d.label);
        if (needLabels) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            tempStream.getTracks().forEach((t) => t.stop());
            setPermissionStatus("granted");
            // re-enumerate to obtain labels
            devices = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devices.filter((d) => d.kind === "videoinput");
          } catch (permErr) {
            console.warn(
              "Permission to list devices denied or not granted:",
              permErr
            );
            setPermissionStatus("denied");
          }
        } else {
          // if we have labels, assume granted if at least one label exists
          if (videoDevices.some((d) => d.label)) setPermissionStatus("granted");
        }

        setCameras(videoDevices);

        if (videoDevices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
        setPermissionStatus("denied");
      }
    };

    loadCameras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load seenPlates from localStorage and purge expired
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_PLATES_KEY);
      if (!raw) return;
      const parsed: SeenPlate[] = JSON.parse(raw);
      const now = Date.now();
      const valid = parsed.filter((p) => now - p.timestamp < EXPIRY_DURATION);
      setSeenPlates(valid);
    } catch (err) {
      console.error("Failed to load seen plates:", err);
    }
  }, []);

  // persist seenPlates whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_PLATES_KEY, JSON.stringify(seenPlates));
    } catch (err) {
      console.error("Failed to save seen plates:", err);
    }
  }, [seenPlates]);

  // start streaming with selected camera
  const startStream = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is not supported in this browser.");
      return;
    }

    // If permission currently denied, try requesting explicitly
    if (permissionStatus === "denied") {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setPermissionStatus("granted");
      } catch (e) {
        alert(
          "Camera permission denied. Please enable camera access in your browser settings."
        );
        return;
      }
    }

    try {
      // If user changed camera while streaming, this will replace srcObject
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      // debug
      console.log("✅ getUserMedia stream:", stream);
      console.log(
        "Tracks:",
        stream
          .getTracks()
          .map((t) => ({ kind: t.kind, id: t.id, enabled: t.enabled }))
      );

      if (videoRef.current) {
        // stop any previously attached tracks first
        if (videoRef.current.srcObject) {
          const old = videoRef.current.srcObject as MediaStream;
          old.getTracks().forEach((t) => t.stop());
        }

        videoRef.current.srcObject = stream;
        setVideoReady(false);

        // attach event listeners
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setVideoReady(true);
            console.log("Video play successful");
          } catch (playErr) {
            console.error("Error while trying to play video:", playErr);
            setVideoReady(false);
          }
        };

        // handle trackend (e.g., camera unplug)
        stream.getTracks().forEach((t) => {
          t.onended = () => {
            console.log("Track ended:", t);
            setIsStreaming(false);
            setVideoReady(false);
          };
        });
      }

      setIsStreaming(true);

      // capture every 0.9s (if not already set)
      if (!intervalId) {
        const id = setInterval(captureAndSendFrame, 900);
        setIntervalId(id);
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setIsStreaming(false);
      // Helpful messages for common errors
      if (err && (err as any).name === "NotAllowedError") {
        setPermissionStatus("denied");
        alert(
          "Camera permission denied. Please allow access or check site settings."
        );
      } else if ((err as any).name === "NotFoundError") {
        alert(
          "Selected camera not found. Try another device or refresh the page."
        );
      } else {
        alert("Failed to start camera. Check console for details.");
      }
    }
  };

  // stop streaming
  const stopStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsStreaming(false);
    setVideoReady(false);
  };

  // when user switches camera while streaming, restart stream
  useEffect(() => {
    if (!isStreaming) return;
    // restart stream using new camera
    (async () => {
      stopStream();
      // small delay ensures tracks are stopped
      await new Promise((r) => setTimeout(r, 150));
      await startStream();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraId]);

  // Clear seen plates cache
  const clearSeenPlates = () => {
    setSeenPlates([]);
    try {
      localStorage.removeItem(SEEN_PLATES_KEY);
    } catch (err) {
      console.error("Failed to clear storage:", err);
    }
  };

  // add detection to UI list (most recent first)
  const pushDetection = (d: Detection) => {
    setDetections((prev) => {
      const next = [d, ...prev];
      // cap to 50 items to avoid unbounded growth
      return next.slice(0, 50);
    });
  };

  // helper to check if plate seen within expiry
  const isPlateSeen = (plate: string) => {
    const now = Date.now();
    return seenPlates.some(
      (p) => p.plate === plate && now - p.timestamp < EXPIRY_DURATION
    );
  };

  // mark plate as seen
  const markPlateSeen = (plate: string) => {
    const now = Date.now();
    setSeenPlates((prev) => {
      const filtered = prev.filter((p) => p.plate !== plate);
      return [...filtered, { plate, timestamp: now }];
    });
  };

  // capture one frame, send to backend detect endpoint
  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // match the video size to canvas for crisp crop
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

        if (!data || !data.detections) return;

        // process each detection
        for (const det of data.detections) {
          const plate = det.plate;
          const confidence = det.ocr_conf;
          const vehicle = det.vehicle ?? null;
          const rawCrop = det.images?.raw_crop ?? null;
          const processedCrop = det.images?.processed_crop ?? null;

          // create detection object for UI
          const detection: Detection = {
            plate,
            ocr_conf: confidence,
            bbox: det.bbox,
            vehicle,
            images: { raw_crop: rawCrop, processed_crop: processedCrop },
            ts: Date.now(),
          };

          pushDetection(detection);

          // if not seen in last 24h, send SMS (if owner_phone exists) and mark seen
          if (!isPlateSeen(plate)) {
            if (vehicle?.owner_phone) {
              // call helper to send SMS (you have this function)
              try {
                await sendDetectionAlert(
                  [vehicle.owner_phone],
                  plate,
                  "Current Location",
                  confidence ?? 0
                );
              } catch (err) {
                console.error("SMS send failed:", err);
              }
            } else {
              // no phone found; you might want to store unknowns or show UI indicator
              console.log(`Plate ${plate} not found in DB (no phone)`);
            }

            markPlateSeen(plate);
          }
        }
      } catch (err) {
        console.error("Error detecting frame:", err);
      }
    }, "image/jpeg");
  };

  // cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, [intervalId]);

  // Small helper for the permission badge text
  const permissionBadge = () => {
    if (permissionStatus === "unsupported")
      return { text: "Not supported", cls: "border-red-500 text-red-400" };
    if (permissionStatus === "denied")
      return { text: "Permission denied", cls: "border-red-500 text-red-400" };
    if (permissionStatus === "granted")
      return {
        text: "Permission granted",
        cls: "border-green-500 text-green-400",
      };
    return { text: "Unknown", cls: "border-yellow-500 text-yellow-400" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4 sm:p-6">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Camera Stream
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={clearSeenPlates}
              className="bg-gray-800 hover:bg-gray-700 text-sm px-3 py-1"
            >
              <Trash className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            <Badge
              variant="outline"
              className={`px-3 py-1 ${
                isStreaming
                  ? "border-green-500 text-green-400"
                  : "border-red-500 text-red-400"
              }`}
            >
              {isStreaming ? "Streaming" : "Stopped"}
            </Badge>

            <Badge
              variant="outline"
              className={`px-3 py-1 ml-2 ${permissionBadge().cls}`}
            >
              {permissionBadge().text}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Camera Card */}
        <section className="lg:col-span-1">
          <Card className="bg-gray-900/60 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-300 flex items-center">
                <Camera className="mr-2 h-5 w-5" />
                Device Camera
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mb-4">
                <Select
                  value={selectedCameraId}
                  onValueChange={setSelectedCameraId}
                  disabled={isStreaming || cameras.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-[240px]">
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

                <div className="mt-3 sm:mt-0 flex gap-2">
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
                        <Play className="h-4 w-4 mr-2" /> Start
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-black rounded overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto aspect-video object-cover bg-black"
                />
                {/* overlay if video not ready */}
                {!videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                    <div>
                      <p className="text-gray-300 text-sm">Video not ready</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Make sure camera permission is allowed and the selected
                        camera is available.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} width={640} height={480} hidden />

              <div className="mt-3 text-xs text-gray-400">
                <p>Snapshots posted every 0.9s while streaming.</p>
                <p>
                  New plates trigger SMS (if owner phone exists) and are cached
                  for 24 hours.
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  Tip: if using mobile, open this app over HTTPS (ngrok or
                  deployed URL) to allow camera access.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Right: Detections list */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Recent Detections
            </h2>
            <div className="text-sm text-gray-400">
              {detections.length} shown (most recent first)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detections.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400 bg-gray-800/30 rounded">
                No detections yet — start the stream to capture frames.
              </div>
            )}

            {detections.map((d) => (
              <article
                key={d.ts}
                className="bg-gray-900/60 border border-gray-700 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="flex gap-3 p-3">
                  {/* image */}
                  <div className="w-28 h-20 flex-shrink-0 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
                    {d.images?.processed_crop ? (
                      <img
                        src={`data:image/jpeg;base64,${d.images.processed_crop}`}
                        className="w-full h-full object-cover"
                        alt="processed crop"
                      />
                    ) : d.images?.raw_crop ? (
                      <img
                        src={`data:image/jpeg;base64,${d.images.raw_crop}`}
                        className="w-full h-full object-cover"
                        alt="raw crop"
                      />
                    ) : (
                      <div className="text-xs text-gray-500">No image</div>
                    )}
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-mono font-semibold">
                          {d.plate}
                        </div>
                        <div className="text-xs text-gray-400">
                          OCR conf: {d.ocr_conf ?? "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-medium ${
                            d.vehicle ? "text-green-400" : "text-yellow-400"
                          }`}
                        >
                          {d.vehicle ? "In DB" : "Unknown"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(d.ts).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* vehicle details */}
                    <div className="mt-2 text-sm">
                      {d.vehicle ? (
                        <div className="text-gray-200">
                          <div>
                            <span className="text-gray-400 text-xs">
                              Owner:
                            </span>{" "}
                            {d.vehicle.owner_name ?? "—"}
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">
                              Phone:
                            </span>{" "}
                            {d.vehicle.owner_phone ?? "—"}
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Type:</span>{" "}
                            {d.vehicle.vehicle_type ?? "—"}
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">
                              Color:
                            </span>{" "}
                            {d.vehicle.color ?? "—"}
                          </div>
                        </div>
                      ) : (
                        <div className="text-yellow-300 text-sm">
                          No matching record in DB
                        </div>
                      )}
                    </div>

                    {/* action row */}
                    <div className="mt-3 flex items-center gap-2">
                      {d.vehicle?.owner_phone ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            sendDetectionAlert(
                              [d.vehicle!.owner_phone!],
                              d.plate,
                              "Manual Location",
                              d.ocr_conf ?? 0
                            )
                          }
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          Send SMS
                        </Button>
                      ) : (
                        <Button size="sm" disabled className="bg-gray-700">
                          No phone
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDetections((prev) =>
                            prev.filter((x) => x.ts !== d.ts)
                          )
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
