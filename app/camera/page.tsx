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
import { Play, Square, ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

interface CameraType {
  id: string;
  label: string;
  status: "online" | "offline";
}

export default function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  // const [detectedCars, setDetectedCars] = useState<string[]>([]);
  // Log on first render
  useEffect(() => {
    console.log("[INIT] First render — cameras:", cameras);
  }, []);

  // Log whenever cameras update
  useEffect(() => {
    console.log("[UPDATE] Cameras changed:", cameras);
  }, [cameras]);

  // Request permission & list available cameras
  const getCameraDevices = async () => {
    try {
      console.log("[PERMISSION] Requesting camera access...");
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      // Stop the temporary stream
      tempStream.getTracks().forEach((track) => track.stop());

      // Get devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          status: "online" as const,
        }));

      console.log("[DEVICES] Found cameras:", videoDevices);

      setCameras(videoDevices);
      setPermissionGranted(true);

      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].id);
      }
    } catch (err) {
      console.error("[ERROR] Camera permission denied", err);
      setPermissionGranted(false);
    }
  };

  const startStream = async () => {
    console.log("[START] Selected camera:", selectedCamera);
    console.log("[START] Available cameras at start:", cameras);

    if (!selectedCamera) {
      console.warn("[WARN] No selected camera, falling back to default");
    }

    try {
      const constraints = selectedCamera
        ? { video: { deviceId: { exact: selectedCamera } } }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
    } catch (err) {
      console.error("[ERROR] Failed to start stream", err);
    }
  };

  const stopStream = () => {
    console.log("[STOP] Stopping stream");
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    // setDetectedCars([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <header className="border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </Link>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            {cameras.length} Cameras Found
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Video */}
        <div className="lg:col-span-2">
          {!permissionGranted && (
            <Button
              onClick={getCameraDevices}
              className="mb-4 w-full bg-blue-600 hover:bg-blue-700"
            >
              Allow Camera
            </Button>
          )}

          <Card className="bg-gray-900/50 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center">
                <Camera className="mr-2 h-5 w-5" /> Video Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 relative">
                {isStreaming ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Select a camera and start streaming
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-4">
                <Select
                  value={selectedCamera}
                  onValueChange={setSelectedCamera}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select Camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {cameras.map((cam) => (
                      <SelectItem key={cam.id} value={cam.id}>
                        {cam.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!isStreaming ? (
                  <Button
                    onClick={startStream}
                    disabled={!selectedCamera}
                    className="bg-green-500"
                  >
                    <Play className="h-4 w-4 mr-2" /> Start
                  </Button>
                ) : (
                  <Button onClick={stopStream} variant="destructive">
                    <Square className="h-4 w-4 mr-2" /> Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="bg-gray-900/50 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400">Camera Status</CardTitle>
            </CardHeader>
            <CardContent>
              {cameras.length > 0 ? (
                cameras.map((cam) => (
                  <div
                    key={cam.id}
                    className="flex justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <span>{cam.label}</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {cam.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No cameras detected</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
