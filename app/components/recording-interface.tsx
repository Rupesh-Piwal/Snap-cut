"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Video,
  VideoOff,
  RefreshCw,
  Trash2,
  Upload,
  Copy,
  ExternalLink,
  Mic,
  MonitorUp,
  MoreVertical,
  Smile,
  Hand,
  Timer,
  AlertCircle
} from "lucide-react";
import { usePiPRecording } from "@/lib/hooks/usePiPRecording";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { requestPresignedUrl, uploadToS3 } from "@/lib/upload-utils";

type ReviewState = "review" | "uploading" | "success" | "error";

export default function RecordingInterface() {
  // --- Hook Integration ---
  const {
    status,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    previewStream,
    setWebcamConfig,
    canvasDimensions,
    toggleWebcam,
    recordedVideoUrl,
    recordedBlob,
    resetRecording,
    MAX_RECORDING_DURATION
  } = usePiPRecording();

  // --- Local UI State ---
  const [webcamEnabled, setWebcamEnabled] = useState(false);

  // Review / Upload State
  const [reviewState, setReviewState] = useState<ReviewState>("review");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareData, setShareData] = useState<{ videoId: string; url: string } | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Webcam Draggable State
  const [webcamPos, setWebcamPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      const newX = Math.min(Math.max(0, initialPosRef.current.x + deltaX), container.width - boxSize);
      const newY = Math.min(Math.max(0, initialPosRef.current.y + deltaY), container.height - boxSize);

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

  // --- Runtime Logic ---
  useEffect(() => {
    if (status === "recording") {
      toggleWebcam(webcamEnabled);
    }
  }, [webcamEnabled, status, toggleWebcam]);

  useEffect(() => {
    if (!previewVideoRef.current) return;
    if (previewStream && (status === "idle" || status === "recording" || status === "initializing" || status === "stopping")) {
      previewVideoRef.current.srcObject = previewStream;
    } else {
      previewVideoRef.current.srcObject = null;
    }
  }, [previewStream, status]);

  // --- Actions ---

  const handleStartRecording = async () => {
    await startRecording(webcamEnabled);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleDiscard = () => {
    resetRecording();
    setReviewState("review");
    setShowDiscardDialog(false);
    setUploadProgress(0);
    setVideoTitle("");
    setShareData(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;

    setReviewState("uploading");
    setUploadError(null);
    setUploadProgress(0);

    try {
      // 1. Get Presigned URL
      const { videoId, uploadUrl, objectKey } = await requestPresignedUrl(recordedBlob.size);

      // 2. Upload to S3
      await uploadToS3(recordedBlob, uploadUrl, (progress) => {
        setUploadProgress(progress);
      });

      // 3. Success
      // TODO: Save metadata to DB (Part 5)

      const shareUrl = `${window.location.origin}/v/${videoId}`;
      setShareData({ videoId, url: shareUrl });
      setReviewState("success");

    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setReviewState("error");
    }
  };

  // --- UI Formatters ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
  const isTimeRunningLow = remainingTime <= 10;

  // --- Views ---

  // 1. LOADING / STOPPING
  if (status === "initializing" || status === "stopping") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/10">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">
              {status === "initializing" ? "Starting..." : "Finalizing..."}
            </h3>
            <p className="text-muted-foreground text-sm">
              {status === "initializing" ? "Setting up..." : "Processing video..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN LAYOUT
  return (
    <main className="flex-1 w-full h-screen bg-background">

      {/* RECORDING / IDLE VIEW */}
      {(status === "idle" || status === "recording") && (
        <div className="flex flex-col h-full bg-[#202124] text-white overflow-hidden border border-white/10">
          {/* VIDEO AREA */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative">
            <div
              ref={containerRef}
              className="relative w-full max-w-6xl aspect-video bg-[#3c4043] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5 group"
            >
              <video
                ref={previewVideoRef}
                muted
                playsInline
                autoPlay
                className={cn(
                  "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                  previewStream ? "opacity-100" : "opacity-0"
                )}
              />

              {/* OVERLAYS */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {status === "recording" && (
                  <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-md backdrop-blur-md shadow-lg animate-in slide-in-from-top-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs font-bold tracking-wider uppercase">REC</span>
                  </div>
                )}
              </div>

              {status === "recording" && (
                <div className={cn(
                  "absolute top-4 right-4 z-10 px-3 py-1.5 rounded-md font-mono text-sm font-medium backdrop-blur-md transition-colors duration-300 flex items-center gap-2",
                  isTimeRunningLow ? "bg-red-500/90 text-white animate-pulse" : "bg-black/40 text-white"
                )}>
                  <Timer className="w-4 h-4 cursor-pointer" />
                  {formatTime(recordingDuration)}
                  <span className="opacity-60 text-xs">/ {formatTime(MAX_RECORDING_DURATION)}</span>
                </div>
              )}

              {webcamEnabled && previewStream && isInitialized && (
                <div
                  onMouseDown={handleMouseDown}
                  className="absolute z-20 cursor-move rounded-lg overflow-hidden shadow-lg ring-1 ring-white/20 hover:ring-white/40 transition-all duration-200"
                  style={{
                    left: webcamPos.x,
                    top: webcamPos.y,
                    width: `${overlaySize}px`,
                    height: `${overlaySize}px`,
                  }}
                >
                  <div className="w-full h-full bg-transparent" />
                </div>
              )}

              {!previewStream && status === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-24 h-24 rounded-full bg-[#303134] flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="h-24 shrink-0 flex items-center justify-center gap-4 pb-4 px-4 bg-[#202124]">
            {status === "idle" ? (
              <div className="flex flex-col items-center gap-2 group">
                <button
                  onClick={handleStartRecording}
                  className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-xl hover:shadow-red-500/30 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/40"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
                <span className="text-xs font-medium text-gray-400">Start Recording</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 group">
                <button
                  onClick={handleStopRecording}
                  className="relative w-16 h-16 rounded-full bg-white hover:bg-gray-100 text-red-600 shadow-xl transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/40"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-red-600 rounded-sm" />
                  </div>
                </button>
                <span className="text-xs font-medium text-gray-400">Stop Recording</span>
              </div>
            )}
            <div className="w-px h-10 bg-white/10 mx-4" />
            <ControlBtn icon={Mic} label="Mic" active={true} />
            <ControlBtn
              icon={webcamEnabled ? Video : VideoOff}
              label={webcamEnabled ? "Cam On" : "Cam Off"}
              active={webcamEnabled}
              onClick={() => setWebcamEnabled(!webcamEnabled)}
              offState={!webcamEnabled}
            />
          </div>
        </div>
      )}

      {/* COMPLETED / UPLOAD VIEW */}
      {(status === "completed") && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* LEFT: Video Player */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recording Ready</h2>
              <span className="text-sm font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                {formatTime(recordingDuration)}
              </span>
            </div>
            <div className="flex-1 bg-black rounded-lg overflow-hidden border border-border shadow-sm">
              {recordedVideoUrl && (
                <video
                  src={recordedVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex flex-col">
            <div className="bg-card border rounded-lg p-6 shadow-sm space-y-6">
              {/* 1. Review Mode */}
              {reviewState === "review" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      placeholder="My Awesome Recording"
                      className="w-full bg-background border px-3 py-2 rounded-md focus:ring-2 ring-primary/20 outline-none"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full gap-2 bg-primary hover:bg-primary/90" onClick={handleUpload}>
                      <Upload className="w-4 h-4" /> Upload Video
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={handleDiscard} className="gap-2">
                        <RefreshCw className="w-4 h-4" /> New Rec
                      </Button>
                      <Button variant="destructive" onClick={() => setShowDiscardDialog(true)} className="gap-2">
                        <Trash2 className="w-4 h-4" /> Discard
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Uploading Mode */}
              {reviewState === "uploading" && (
                <div className="space-y-6 py-8 animate-in fade-in zoom-in-95">
                  <div className="space-y-2 text-center">
                    <div className="text-2xl font-bold">{uploadProgress}%</div>
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">Uploading to secure storage...</p>
                  </div>
                </div>
              )}

              {/* 3. Success Mode */}
              {reviewState === "success" && shareData && (
                <div className="space-y-6 animate-in fade-in zoom-in-95">
                  <div className="p-4 bg-green-500/10 text-green-500 rounded-lg flex items-center gap-3">
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-semibold">Upload Complete!</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-muted-foreground">Share Link</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono truncate border">
                        {shareData.url}
                      </div>
                      <Button size="icon" variant="outline" onClick={() => navigator.clipboard.writeText(shareData.url)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <Button className="w-full gap-2" asChild>
                      <a href={shareData.url} target="_blank" rel="noopener noreferrer">
                        Open Link <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" onClick={handleDiscard} className="w-full">
                      Record Another
                    </Button>
                  </div>
                </div>
              )}

              {/* 4. Error Mode */}
              {reviewState === "error" && (
                <div className="space-y-6 animate-in fade-in shake">
                  <div className="p-4 bg-red-500/10 text-red-500 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Upload Failed</span>
                  </div>
                  <p className="text-sm text-red-400">{uploadError || "Network error occurred."}</p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={handleUpload} className="w-full">Retry Upload</Button>
                    <Button variant="ghost" onClick={() => setReviewState("review")}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Discard Dialog */}
          {showDiscardDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-background p-6 rounded-lg shadow-xl max-w-sm w-full border">
                <h3 className="text-lg font-semibold mb-2">Discard Recording?</h3>
                <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. You will lose the current video.</p>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowDiscardDialog(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDiscard}>Confirm Discard</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ERROR STATE */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">Reload Page</Button>
        </div>
      )}

    </main>
  );
}

function ControlBtn({
  icon: Icon,
  label,
  onClick,
  active = false,
  offState = false,
  variant = "default",
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  active?: boolean;
  offState?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 group min-w-[3.5rem]",
        offState ? "opacity-70" : "opacity-100"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200",
        variant === "danger"
          ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
          : active
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-transparent text-gray-400 hover:bg-white/5"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
        {label}
      </span>
    </button>
  );
}
