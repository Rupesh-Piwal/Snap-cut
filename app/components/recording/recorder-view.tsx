"use client";

import { useRef, useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BackgroundOption } from "@/lib/backgrounds";
import { WebcamShape, WebcamSize } from "@/lib/types";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";
import { PreviewStage } from "./preview-stage";
import {
  CameraIcon,
  CursorClickIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";

export interface RecorderViewProps {
  status:
  | "idle"
  | "recording"
  | "initializing"
  | "stopping"
  | "completed"
  | "error";
  webcamEnabled: boolean;
  previewStream: MediaStream | null; // Keep for "is ready" check
  recordingDuration: number;
  MAX_RECORDING_DURATION: number;
  canvasDimensions: { width: number; height: number };
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  permissions: { camera: boolean; mic: boolean; screen: boolean };
  onRequestCameraMic: () => void;
  onRequestScreen: () => void;
  webcamPreviewStream: MediaStream | null;
  screenPreviewStream: MediaStream | null;
  canRecord: boolean;
  permissionError: string | null;
  permissionErrorType?: string | null;
  countdownValue: number | null;
  background: BackgroundOption;
  onSetBackground: (bg: BackgroundOption) => void;
  webcamShape: WebcamShape;
  setWebcamShape: (shape: WebcamShape) => void;
  webcamSize: WebcamSize;
  setWebcamSize: (size: WebcamSize) => void;
  webcamPosition: { x: number; y: number };
  setWebcamPosition: (pos: { x: number; y: number }) => void;

  micStream: MediaStream | null;

  previewMode: "canvas" | "video";
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  screenSourceRef: React.RefObject<HTMLVideoElement | null>;
  cameraSourceRef: React.RefObject<HTMLVideoElement | null>;
}

export function RecorderView({
  status,
  webcamEnabled,
  previewStream,
  recordingDuration,
  MAX_RECORDING_DURATION,
  canvasDimensions,
  onStartRecording,
  onStopRecording,
  onToggleWebcam,
  micEnabled,
  onToggleMic,
  permissions,
  onRequestCameraMic,
  onRequestScreen,
  webcamPreviewStream,
  screenPreviewStream,
  canRecord,
  permissionError,
  countdownValue,
  background,
  onSetBackground,
  webcamShape,
  setWebcamShape,
  webcamSize,
  setWebcamSize,
  webcamPosition,
  setWebcamPosition,
  micStream,
  previewMode,
  previewCanvasRef,
  previewVideoRef,
  screenSourceRef,
  cameraSourceRef,
}: RecorderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      setIsInitialized(true);
    }
  }, [canvasDimensions, isInitialized]);

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;
  const hasAnyPermission = permissions.camera || permissions.mic;

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const getWebcamRect = () => {
    const sizeMap = { s: 240, m: 350, l: 480 };
    const size = sizeMap[webcamSize];
    return { x: webcamPosition.x, y: webcamPosition.y, w: size, h: size };
  };

  const mapEventToCanvas = (e: React.PointerEvent) => {
    // Measure canvas if in canvas mode, or video if in video mode?
    // Dragging only happens in canvas mode (webcam overlay).
    // So we rely on previewCanvasRef.
    const el = previewCanvasRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!webcamEnabled || previewMode !== "canvas") return;
    const pos = mapEventToCanvas(e);
    if (!pos) return;

    const webcamRect = getWebcamRect();
    if (
      pos.x >= webcamRect.x &&
      pos.x <= webcamRect.x + webcamRect.w &&
      pos.y >= webcamRect.y &&
      pos.y <= webcamRect.y + webcamRect.h
    ) {
      isDraggingRef.current = true;
      dragOffsetRef.current = {
        x: pos.x - webcamRect.x,
        y: pos.y - webcamRect.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const [isHoveringWebcam, setIsHoveringWebcam] = useState(false);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (previewMode !== "canvas") return;
    const pos = mapEventToCanvas(e);
    if (!pos) return;

    if (isDraggingRef.current) {
      let newX = pos.x - dragOffsetRef.current.x;
      let newY = pos.y - dragOffsetRef.current.y;

      const sizeMap = { s: 240, m: 350, l: 480 };
      const size = sizeMap[webcamSize];

      newX = Math.max(0, Math.min(newX, 1920 - size));
      newY = Math.max(0, Math.min(newY, 1080 - size));

      setWebcamPosition({ x: newX, y: newY });
      return;
    }

    // Check hover
    if (webcamEnabled) {
      const webcamRect = getWebcamRect();
      if (
        pos.x >= webcamRect.x &&
        pos.x <= webcamRect.x + webcamRect.w &&
        pos.y >= webcamRect.y &&
        pos.y <= webcamRect.y + webcamRect.h
      ) {
        if (!isHoveringWebcam) setIsHoveringWebcam(true);
      } else {
        if (isHoveringWebcam) setIsHoveringWebcam(false);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    if (e.target) (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col text-white overflow-hidden min-h-screen bg-[#0E0E10]">
      {/* Removed hidden videos, handled by usePreviewRenderer internally */}

      <div className="flex-1 flex items-center justify-center relative m-2 card-font">
        {!hasAnyPermission && status === "idle" ? (
          <div className="max-w-md w-full space-y-8 p-8 flex flex-col items-center animate-in fade-in duration-500 bg-black/40 backdrop-blur-2xl rounded-3xl border border-[#1c1c1c] shadow-2xl">
            {permissionError ? (
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-2 ring-1 ring-red-500/20 backdrop-blur-sm">
                  <span className="text-red-500 font-bold text-2xl">✕</span>
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-bold text-white">
                    Can&apos;t access your devices
                  </h2>
                  <p className="text-white/60 text-base leading-relaxed">
                    {permissionError ||
                      "Please make sure your camera and microphone are connected. Close any other apps that are currently using them."}
                  </p>
                </div>

                <Button
                  onClick={onRequestCameraMic}
                  size="lg"
                  className="bg-[#6366f1] hover:bg-[#5558dd] text-white px-8 h-12 rounded-xl font-medium transition-all duration-200 mt-4"
                >
                  Try again
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10 backdrop-blur-md">
                    <CameraIcon size={32} weight="duotone" />
                  </div>
                  <h2 className="text-3xl font-bold bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent tracking-tight">
                    Permission to record
                  </h2>
                  <p className="text-white/50 text-base tracking-tight">
                    We need access to your camera and microphone.
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button
                    onClick={onRequestCameraMic}
                    size="lg"
                    className="w-full h-13 text-[18px] font-semibold bg-white/90 hover:bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] backdrop-blur-sm cursor-pointer tracking-wide"
                  >
                    <VideoCameraIcon size={22} weight="duotone" />
                    Enable camera & microphone
                  </Button>
                </div>

                <p className="text-center text-white/30 text-sm flex flex-row items-center justify-center gap-1 mt-2 ">
                  <CursorClickIcon size={18} weight="duotone" />
                  Click "Allow" to continue.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-3xl h-[calc(100vh-220px)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5"
          >
            <PreviewStage
              mode={previewMode}
              canvasRef={previewCanvasRef}
              videoRef={previewVideoRef}
              screenSourceRef={screenSourceRef}
              cameraSourceRef={cameraSourceRef}
              className={cn(
                "transition-opacity duration-500",
                previewStream ? "opacity-100" : "opacity-0",
                canRecord ? "cursor-default" : "",
                isHoveringWebcam
                  ? isDraggingRef.current
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "",
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            {!previewStream && (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                Initializing Engine...
              </div>
            )}

            {countdownValue !== null && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                <div
                  className="text-9xl font-bold text-white animate-in zoom-in duration-300"
                  key={countdownValue}
                >
                  {countdownValue}
                </div>
              </div>
            )}

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
                <span className="font-semibold">
                  {formatTime(recordingDuration)}
                </span>
                <span className="opacity-50 text-xs font-normal">
                  / {formatTime(MAX_RECORDING_DURATION)}
                </span>
              </div>
            )}

            <div className="absolute bottom-6 left-6 z-10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono text-white/70">
              {canvasDimensions.width}x{canvasDimensions.height}
            </div>
          </div>
        )}
      </div>

      <ControlBar
        status={status}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        webcamEnabled={webcamEnabled}
        onToggleWebcam={onToggleWebcam}
        micEnabled={micEnabled}
        onToggleMic={onToggleMic}
        recordingDuration={recordingDuration}
        screenShareEnabled={permissions.screen}
        onToggleScreenShare={onRequestScreen}
        canRecord={canRecord}
        background={background}
        onSetBackground={onSetBackground}
        webcamShape={webcamShape}
        onSetWebcamShape={setWebcamShape}
        webcamSize={webcamSize}
        onSetWebcamSize={setWebcamSize}
        micStream={micStream}
      />
    </div>
  );
}
