"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Video, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";

interface RecorderViewProps {
  status:
  | "idle"
  | "recording"
  | "initializing"
  | "stopping"
  | "completed"
  | "error"; // broad to match
  webcamEnabled: boolean;
  previewStream: MediaStream | null;
  recordingDuration: number;
  MAX_RECORDING_DURATION: number;
  canvasDimensions: { width: number; height: number };
  setWebcamConfig: (config: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
}

export function RecorderView({
  status,
  webcamEnabled,
  previewStream,
  recordingDuration,
  MAX_RECORDING_DURATION,
  canvasDimensions,
  setWebcamConfig,
  onStartRecording,
  onStopRecording,
  onToggleWebcam,
  micEnabled,
  onToggleMic,
}: RecorderViewProps) {
  // --- Refs & State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const [overlaySize, setOverlaySize] = useState(160);

  // --- Helpers ---
  const updateOverlaySize = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const calculatedSize = (width / 1920) * 320;
      setOverlaySize(calculatedSize);
    }
  }, []);

  // --- Initialization & Resizing ---
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      const container = containerRef.current.getBoundingClientRect();
      const defaultCanvasX = 1580;
      const defaultCanvasY = 740;

      const scaleX = container.width / canvasDimensions.width;
      const scaleY = container.height / canvasDimensions.height;
      const calculatedSize = (container.width / 1920) * 320;

      setOverlaySize(calculatedSize);
      setWebcamPos({
        x: defaultCanvasX * scaleX,
        y: defaultCanvasY * scaleY,
      });
      setIsInitialized(true);
    }
  }, [containerRef.current, canvasDimensions, isInitialized]);

  useEffect(() => {
    window.addEventListener("resize", updateOverlaySize);
    return () => window.removeEventListener("resize", updateOverlaySize);
  }, [updateOverlaySize]);

  // --- Dragging Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!webcamEnabled) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...webcamPos };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const container = containerRef.current.getBoundingClientRect();
      const boxSize = overlaySize;

      const newX = Math.min(
        Math.max(0, initialPosRef.current.x + deltaX),
        container.width - boxSize,
      );
      const newY = Math.min(
        Math.max(0, initialPosRef.current.y + deltaY),
        container.height - boxSize,
      );

      setWebcamPos({ x: newX, y: newY });

      // Sync with Canvas
      const scaleX = canvasDimensions.width / container.width;
      const scaleY = canvasDimensions.height / container.height;

      setWebcamConfig({
        x: newX * scaleX,
        y: newY * scaleY,
        width: 320,
        height: 320,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, canvasDimensions, setWebcamConfig, overlaySize]);

  // --- Video Source ---
  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (
      previewStream &&
      (status === "idle" ||
        status === "recording" ||
        status === "initializing" ||
        status === "stopping")
    ) {
      previewVideoRef.current.srcObject = previewStream;
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream, status]);

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;

  return (
    <div className="flex flex-col text-white overflow-hidden min-h-screen bg-[#0a0a0a]">
      {/* VIDEO AREA */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl h-[calc(100vh-120px)] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        >
          <video
            ref={previewVideoRef}
            muted
            playsInline
            autoPlay
            className={cn(
              "absolute inset-0 w-full h-full object-contain transition-opacity duration-500",
              previewStream ? "opacity-100" : "opacity-0",
            )}
          />

          {/* OVERLAYS */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
            {status === "recording" && (
              <div className="flex items-center gap-2.5 bg-red-500/15 text-red-400 px-4 py-2 rounded-full backdrop-blur-xl border border-red-500/20 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-sm font-semibold tracking-wide">
                  REC
                </span>
              </div>
            )}
          </div>

          {status === "recording" && (
            <div
              className={cn(
                "absolute top-6 right-6 z-10 px-4 py-2 rounded-full font-mono text-sm font-medium backdrop-blur-xl transition-all duration-300 flex items-center gap-2.5 border shadow-lg",
                isTimeRunningLow
                  ? "bg-red-500/15 text-red-400 border-red-500/20 animate-pulse"
                  : "bg-white/5 text-white border-white/10",
              )}
            >
              <Timer className="w-4 h-4" />
              <span className="font-semibold">{formatTime(recordingDuration)}</span>
              <span className="opacity-50 text-xs font-normal">
                / {formatTime(MAX_RECORDING_DURATION)}
              </span>
            </div>
          )}

          {webcamEnabled && previewStream && isInitialized && (
            <div
              onMouseDown={handleMouseDown}
              className="absolute z-20 cursor-move rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20 hover:ring-white/40 transition-all duration-300 hover:scale-105"
              style={{
                left: webcamPos.x,
                top: webcamPos.y,
                width: `${overlaySize}px`,
                height: `${overlaySize}px`,
              }}
            >
              {/* This div represents the webcam overlay area where dragging is captured */}
              <div className="w-full h-full bg-transparent backdrop-blur-sm" />
            </div>
          )}

          {!previewStream && status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center p-8">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2 animate-in zoom-in-50 fade-in duration-500">
                <Video className="w-10 h-10 text-white/40" />
              </div>
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <h3 className="text-xl font-semibold text-white/80">Ready to Record</h3>
                <p className="text-sm text-white/40 max-w-md">
                  Click "Start Recording" to begin capturing your screen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      <ControlBar
        status={status}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        webcamEnabled={webcamEnabled}
        onToggleWebcam={onToggleWebcam}
        micEnabled={micEnabled}
        onToggleMic={onToggleMic}
        recordingDuration={recordingDuration}
        onReset={() => { }} // No-op for now as we don't have reset exposed in the hook yet
        onPause={() => { }} // No-op
        onDelete={() => { }} // No-op
      />
    </div>
  );
}
