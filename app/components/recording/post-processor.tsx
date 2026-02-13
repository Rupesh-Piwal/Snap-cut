"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { LayoutId, getLayout } from "@/lib/layouts/layout-engine";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "./utils"; // Assuming utils exists in same folder or I need to import from parent
import { BackgroundOption } from "@/lib/backgrounds";

// Mock Slider if simple-ui not available, but let's assume shadcn/ui slider is there or basic input range
// "UI Toggle state... Reuse existing card / button components if possible"

interface PostProcessorProps {
  screenBlob: Blob | null;
  cameraBlob: Blob | null; // Can be null if only screen recorded
  // If camera is primary/only, it might be passed as screenBlob in a dirty hack, but let's assume we handle it properly
  // Actually, if "Camera Only" recording, we likely have cameraBlob but no screenBlob?
  // Code in usePiPRecording:
  // if (screenStream) { screenBlob = primary; cameraBlob = secondary }
  // else { cameraBlob = primary; }
  // So we should handle both being present or one.

  initialLayout: LayoutId;
  background: BackgroundOption; // NEW: Background selection
  onExportStart: () => void;
  onExportProgress: (progress: number) => void;
  onExportComplete: (url: string, blob: Blob) => void;
  onExportError: (error: Error) => void;
}

export interface PostProcessorRef {
  exportVideo: () => void;
}

export const PostProcessor = forwardRef<PostProcessorRef, PostProcessorProps>(
  (
    {
      screenBlob,
      cameraBlob,
      initialLayout,
      background,
      onExportStart,
      onExportProgress,
      onExportComplete,
      onExportError,
    },
    ref,
  ) => {
    const [layoutId, setLayoutId] = useState<LayoutId>(initialLayout);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const cameraVideoRef = useRef<HTMLVideoElement>(null);
    const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Create object URLs on mount, revoke on unmount
    const [screenUrl, setScreenUrl] = useState<string | null>(null);
    const [cameraUrl, setCameraUrl] = useState<string | null>(null);

    // Background Image Loading
    const [backgroundImage, setBackgroundImage] =
      useState<HTMLImageElement | null>(null);

    useEffect(() => {
      if (background.type === "image") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = background.value;
        img.onload = () => setBackgroundImage(img);
        img.onerror = () => {
          console.error("Failed to load background image:", background.value);
          setBackgroundImage(null); // Fallback to no image
        };
      } else {
        setBackgroundImage(null);
      }
    }, [background]);

    useEffect(() => {
      if (screenBlob) {
        const url = URL.createObjectURL(screenBlob);
        setScreenUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setScreenUrl(null); // <-- Add this to handle null case
      }
    }, [screenBlob]);

    useEffect(() => {
      if (cameraBlob) {
        const url = URL.createObjectURL(cameraBlob);
        setCameraUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setCameraUrl(null); // Handle null case
      }
    }, [cameraBlob]);

    // Handle Metadata Loaded to set Duration
    // WebM blobs from MediaRecorder often report Infinity duration initially
    // Workaround: seek to a very large value to force browser to calculate real duration
    const handleMetadata = () => {
      const v1 = screenVideoRef.current;
      const v2 = cameraVideoRef.current;
      const primaryVideo = v1 || v2;

      if (!primaryVideo) return;

      // If duration is valid, use it directly
      if (primaryVideo.duration && isFinite(primaryVideo.duration) && primaryVideo.duration > 0) {
        setDuration(primaryVideo.duration);
        return;
      }

      // WebM blob workaround: seek to large value to force duration calculation
      const handleDurationFix = () => {
        if (isFinite(primaryVideo.duration) && primaryVideo.duration > 0) {
          setDuration(primaryVideo.duration);
          primaryVideo.currentTime = 0; // Seek back to start
          primaryVideo.removeEventListener('durationchange', handleDurationFix);
        }
      };

      primaryVideo.addEventListener('durationchange', handleDurationFix);
      // Trigger duration calculation by seeking to end
      primaryVideo.currentTime = Number.MAX_SAFE_INTEGER;
    };

    // Sync Logic
    const syncVideos = (time: number) => {
      if (screenVideoRef.current && Number.isFinite(time))
        screenVideoRef.current.currentTime = time;
      if (cameraVideoRef.current && Number.isFinite(time))
        cameraVideoRef.current.currentTime = time;
    };

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const layout = getLayout(layoutId);
      layout.render(
        ctx,
        screenVideoRef.current,
        cameraVideoRef.current,
        canvas.width,
        canvas.height,
        backgroundImage || background,
      );
    }, [layoutId, background, backgroundImage]);

    // Loop
    // Loop
    useEffect(() => {
      const loop = () => {
        const v = screenVideoRef.current || cameraVideoRef.current;
        if (v && !v.paused && !v.ended) {
          setCurrentTime(v.currentTime);
        }

        // If ended, stop
        if (v && v.ended) {
          setIsPlaying(false);
        }

        draw();
      };

      if (isPlaying) {
        screenVideoRef.current?.play().catch(() => { });
        cameraVideoRef.current?.play().catch(() => { });

        // Use setInterval instead of rAF
        playbackIntervalRef.current = setInterval(loop, 1000 / 60); // 60 FPS target
      } else {
        screenVideoRef.current?.pause();
        cameraVideoRef.current?.pause();
        draw(); // Draw static frame

        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
      }

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    }, [isPlaying, draw, layoutId]); // Re-run loop setup if play state changes

    // Seek Handler
    const handleSeek = (val: number[]) => {
      const newTime = val[0];
      setCurrentTime(newTime);
      syncVideos(newTime);
      draw(); // Immediate update
    };

    const togglePlay = () => {
      if (currentTime >= duration) {
        setCurrentTime(0);
        syncVideos(0);
      }
      setIsPlaying(!isPlaying);
    };

    // Public Export Method
    useImperativeHandle(ref, () => ({
      exportVideo: async () => {
        // 1. Stop playback
        setIsPlaying(false);
        onExportStart();

        // Declare AudioContext outside try block so it's accessible in catch for cleanup
        let ctx: AudioContext | null = null;

        try {
          const canvas = canvasRef.current;
          const vScreen = screenVideoRef.current;
          const vCamera = cameraVideoRef.current;
          if (!canvas) throw new Error("No canvas");

          // 2. Reset to start
          const seekToStart = (video: HTMLVideoElement) =>
            new Promise<void>((resolve) => {
              video.currentTime = 0;
              video.onseeked = () => {
                video.onseeked = null;
                resolve();
              };
            });

          await Promise.all([
            vScreen ? seekToStart(vScreen) : Promise.resolve(),
            vCamera ? seekToStart(vCamera) : Promise.resolve(),
          ]);
          // 3. Setup Recorder
          const stream = canvas.captureStream(60); // 60 FPS Export

          // Add Audio Track from videos
          // Usually we want the Mixed Audio we recorded.
          // It resides on the Screen Blob (Primary) usually.
          // We need to create an AudioContext to mix them again?
          // OR just take the track from the video element.
          // Capturing audio from a video element into a MediaStream is tricky (captureStream() on video element is experimental).
          // Standard way: Web Audio API.

          ctx = new AudioContext();
          const dest = ctx.createMediaStreamDestination();

          if (vScreen) {
            // Create source from video element? CORS issues if not careful, but blob is local so ok.
            try {
              const src = ctx.createMediaElementSource(vScreen);
              src.connect(dest);
            } catch (e) {
              console.warn("Audio export setup failed for screen", e);
            }
          }
          // If camera has audio (e.g. camera only mode), mix it too?
          // In our recorder implementation, we mixed EVERYTHING into the Primary Blob.
          // So we only need audio from Primary.
          // If Camera Blob is secondary, it is muted/video-only.

          dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

          const recorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9,opus",
            videoBitsPerSecond: 5000000, // High quality export
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            onExportProgress(100); // Ensure 100% is reported
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            onExportComplete(url, blob);

            // Cleanup Audio Context
            ctx?.close();
          };

          recorder.start(100);

          // 4. Play videos to drive rendering
          // We need a loop that draws to canvas while recorder is running
          // We can't use requestAnimationFrame if the tab is backgrounded?
          // Export should ideally happen in foreground.



          await Promise.all([
            vScreen ? vScreen.play() : Promise.resolve(),
            vCamera ? vCamera.play() : Promise.resolve(),
          ]);

          let exportInterval: NodeJS.Timeout | null = null;

          const exportLoop = () => {
            // Track export progress
            const primary = vScreen || vCamera;
            if (primary && duration > 0) {
              const progress = Math.min((primary.currentTime / duration) * 100, 100);
              onExportProgress(progress);
            }

            draw();
            if (recorder.state === "recording") {
              // Continue loop
            } else {
              if (exportInterval) clearInterval(exportInterval);
            }
          };

          exportInterval = setInterval(exportLoop, 1000 / 60);

          // 5. Wait for end
          // Listen for 'ended' on primary video
          const primary = vScreen || vCamera;
          if (primary) {
            primary.onended = () => {
              recorder.stop();
              if (exportInterval) clearInterval(exportInterval);
              primary.onended = null; // cleanup
            };
          } else {
            recorder.stop();
            if (exportInterval) clearInterval(exportInterval);
          }
        } catch (err) {
          // Cleanup AudioContext on error to prevent resource leak
          try {
            ctx?.close();
          } catch {
            // Ignore cleanup errors
          }
          onExportError(err as Error);
        }
      },
    }));

    // Update layout from parent
    useEffect(() => setLayoutId(initialLayout), [initialLayout]);

    return (
      <div className="relative w-full aspect-video bg-black/40 flex flex-col group">

        {/* Hidden Sources */}
        <div className="hidden">
          {screenUrl && (
            <video
              ref={screenVideoRef}
              src={screenUrl}
              onLoadedMetadata={handleMetadata}
              muted={
                isMuted
              } /* Mute preview audio if needed, but usually we want to hear it */
              playsInline
              crossOrigin="anonymous" // vital for WebAudio
            />
          )}
          {cameraUrl && (
            <video
              ref={cameraVideoRef}
              src={cameraUrl}
              onLoadedMetadata={handleMetadata}
              muted={true} /* Secondary always muted to avoid echo */
              playsInline
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Canvas Preview */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full bg-transparent"
        />


        {/* Custom Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex flex-col gap-2">
            {/* Seeker */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek([parseFloat(e.target.value)])}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white" />
                  )}
                </button>
                <span className="text-sm font-mono opacity-80">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

PostProcessor.displayName = "PostProcessor";
