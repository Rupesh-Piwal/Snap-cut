import { useRef, useState, useEffect } from "react";
import { Video, Timer, Monitor, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";
import { Button } from "@/components/ui/button";
import { BackgroundOption } from "@/lib/backgrounds";
import { WebcamShape, WebcamSize } from "@/lib/hooks/usePiPRecording";

interface RecorderViewProps {
  status:
  | "idle"
  | "recording"
  | "initializing"
  | "stopping"
  | "completed"
  | "error";
  webcamEnabled: boolean;
  previewStream: MediaStream | null;
  recordingDuration: number;
  MAX_RECORDING_DURATION: number;
  canvasDimensions: { width: number; height: number };
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleWebcam: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  // Permission props
  permissions: { camera: boolean; mic: boolean; screen: boolean };
  onRequestCameraMic: () => void;
  onRequestScreen: () => void;
  // New props
  webcamPreviewStream: MediaStream | null;
  screenPreviewStream: MediaStream | null;
  canRecord: boolean;
  permissionError: string | null;
  permissionErrorType?: string | null;
  // Countdown props
  countdownValue: number | null;
  onCancelCountdown: () => void;
  background: BackgroundOption;
  onSetBackground: (bg: BackgroundOption) => void;
  webcamShape: WebcamShape;
  setWebcamShape: (shape: WebcamShape) => void;
  webcamSize: WebcamSize;
  setWebcamSize: (size: WebcamSize) => void;
  webcamPosition: { x: number; y: number };
  setWebcamPosition: (pos: { x: number; y: number }) => void;
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
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
  // onCancelCountdown,
  background,
  onSetBackground,
  webcamShape,
  setWebcamShape,
  webcamSize,
  setWebcamSize,
  webcamPosition,
  setWebcamPosition,
  webcamVideoRef,
  screenVideoRef,
}: RecorderViewProps) {
  // --- Refs & State ---
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // No dragging state needed anymore
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      setIsInitialized(true);
    }
  }, [canvasDimensions, isInitialized]);

  // --- Video Sources ---
  // Main preview (Unified Canvas Stream)
  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Source streams are attached to hidden video elements manually here
  // because useStreams effect runs BEFORE refs are populated by React.
  // We must ensure the DOM elements get the stream.

  // Webcam source
  useEffect(() => {
    if (!webcamVideoRef.current) return;
    if (webcamPreviewStream && webcamEnabled) {
      webcamVideoRef.current.srcObject = webcamPreviewStream;
      webcamVideoRef.current.play().catch(console.error);
    } else {
      webcamVideoRef.current.srcObject = null;
    }
  }, [webcamPreviewStream, webcamEnabled]);

  // Screen source
  useEffect(() => {
    if (!screenVideoRef.current) return;
    if (screenPreviewStream) {
      screenVideoRef.current.srcObject = screenPreviewStream; // Fixed: was screenVideoRef.current.srcObject = screenPreviewStream; 
      // Wait, original code had `screenVideoRef.current.srcObject = screenPreviewStream;` 
      // AND `previewVideoRef.current.srcObject = screenPreviewStream;` in my earlier read? 
      // No, line 126 says `screenVideoRef.current.srcObject`.
      screenVideoRef.current.play().catch(console.error);
    } else {
      screenVideoRef.current.srcObject = null;
    }
  }, [screenPreviewStream, permissions.screen]);

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;

  // Permission gate check
  const hasAnyPermission = permissions.camera || permissions.mic;

  // --- Dragging Logic ---
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const getWebcamRect = () => {
    const sizeMap = { s: 240, m: 350, l: 480 };
    const size = sizeMap[webcamSize];
    return { x: webcamPosition.x, y: webcamPosition.y, w: size, h: size };
  };

  const mapEventToCanvas = (e: React.PointerEvent) => {
    if (!previewVideoRef.current) return null;
    const rect = previewVideoRef.current.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!webcamEnabled) return;
    const pos = mapEventToCanvas(e);
    if (!pos) return;

    const webcamRect = getWebcamRect();
    // Check hit test (simple rect for now, even if circle)
    if (
      pos.x >= webcamRect.x &&
      pos.x <= webcamRect.x + webcamRect.w &&
      pos.y >= webcamRect.y &&
      pos.y <= webcamRect.y + webcamRect.h
    ) {
      isDraggingRef.current = true;
      dragOffsetRef.current = {
        x: pos.x - webcamRect.x,
        y: pos.y - webcamRect.y
      };
      // Capture pointer
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const pos = mapEventToCanvas(e);
    if (!pos) return;

    // Calculate new position
    let newX = pos.x - dragOffsetRef.current.x;
    let newY = pos.y - dragOffsetRef.current.y;

    // Clamp to canvas (1920x1080)
    const sizeMap = { s: 240, m: 350, l: 480 };
    const size = sizeMap[webcamSize];

    // Allow sticking to edges? 
    // Basic clamping
    newX = Math.max(0, Math.min(newX, 1920 - size));
    newY = Math.max(0, Math.min(newY, 1080 - size));

    setWebcamPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex flex-col text-white overflow-hidden min-h-screen bg-[#0E0E10]">
      {/* Hidden Source Videos for Canvas Drawing - Visually hidden instead of display:none to avoid engine throttling */}
      <div className="absolute opacity-0 pointer-events-none -z-50" aria-hidden="true">
        <video ref={screenVideoRef} autoPlay playsInline muted />
        <video ref={webcamVideoRef} autoPlay playsInline muted />
      </div>

      {/* VIDEO AREA */}
      <div className="flex-1 flex items-center justify-center relative m-2">
        {/* Permission Gate or Main Video Area */}
        {!hasAnyPermission && status === "idle" ? (
          <div className="max-w-md w-full space-y-8 p-8 flex flex-col items-center animate-in fade-in duration-500 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
            {permissionError ? (
              // ERROR STATE
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
              // INITIAL PERMISSION STATE
              <>
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10 backdrop-blur-md">
                    <Camera className="w-10 h-10 text-white/60" />
                  </div>
                  <h2 className="text-3xl font-bold bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Permission to record
                  </h2>
                  <p className="text-white/50 text-base">
                    We need access to your camera and microphone.
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button
                    onClick={onRequestCameraMic}
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-white/90 hover:bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] backdrop-blur-sm"
                  >
                    <Video className="w-5 h-5 mr-3" />
                    Enable camera & microphone
                  </Button>
                </div>

                <p className="text-center text-white/30 text-sm">
                  Your browser will ask for permission. Click "Allow" to
                  continue.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-420 h-[calc(100vh-220px)] bg-black/30 backdrop-blur-3xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5"
          >
            {/* Unified Canvas Preview (Always Visible if stream exists) */}
            <video
              ref={previewVideoRef}
              muted
              playsInline
              autoPlay
              className={cn(
                "absolute inset-0 w-full h-full object-contain transition-opacity duration-500",
                previewStream ? "opacity-100" : "opacity-0",
                canRecord ? "cursor-default" : ""
              )}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ touchAction: "none" }} // Prevent scrolling on touch
            />

            {!previewStream && (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                Initializing Engine...
              </div>
            )}


            {/* OVERLAYS */}
            {/* Countdown Overlay */}
            {countdownValue !== null && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="text-9xl font-bold text-white animate-in zoom-in duration-300" key={countdownValue}>
                  {countdownValue}
                </div>
                {/* <button
                  onClick={onCancelCountdown}
                  className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all"
                >
                  Cancel
                </button> */}
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
          </div>
        )}
      </div>

      {/* CONTROL BAR */}
      <ControlBar
        status={status}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        webcamEnabled={webcamEnabled}
        onToggleWebcam={onToggleWebcam}
        micEnabled={micEnabled}
        onToggleMic={onToggleMic}
        recordingDuration={recordingDuration}
        onReset={() => { }}
        onPause={() => { }}
        onDelete={() => { }}
        screenShareEnabled={permissions.screen}
        onToggleScreenShare={onRequestScreen}
        canRecord={canRecord}
        background={background}
        onSetBackground={onSetBackground}
        webcamShape={webcamShape}
        onSetWebcamShape={setWebcamShape}
        webcamSize={webcamSize}
        onSetWebcamSize={setWebcamSize}
      />
    </div>
  );
}
