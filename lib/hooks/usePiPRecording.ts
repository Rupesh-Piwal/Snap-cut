import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RecordingStateMachine } from "../recording-state-machine";
import { useStreams } from "./useStreams";
import { useRecording } from "./useRecording";
import { BunnyRecordingState, RecordingState } from "../types";
import { BackgroundOption, NO_BACKGROUND } from "../backgrounds";
import { drawBackground } from "../layouts/layout-engine";

// Configuration
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export type WebcamShape = "circle" | "square" | "rounded_square";
export type WebcamSize = "s" | "m" | "l";

export const usePiPRecording = () => {
    // --- FSM & State ---
    const fsmRef = useRef<RecordingStateMachine>(new RecordingStateMachine());
    const [state, setState] = useState<BunnyRecordingState>({
        status: "idle",
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
        error: null,
    });

    const [countdownValue, setCountdownValue] = useState<number | null>(null);

    // --- Background State ---
    const [background, setBackground] = useState<BackgroundOption>(NO_BACKGROUND);
    const backgroundImageElementRef = useRef<HTMLImageElement | null>(null);

    // Preload background image
    useEffect(() => {
        if (background.type === "image" && background.value) {
            const img = new Image();
            img.src = background.value;
            img.crossOrigin = "anonymous";
            img.onload = () => {
                backgroundImageElementRef.current = img;
            };
        } else {
            backgroundImageElementRef.current = null;
        }
    }, [background]);

    // --- Webcam Configuration State ---
    const [webcamShape, setWebcamShape] = useState<WebcamShape>("circle");
    const [webcamSize, setWebcamSize] = useState<WebcamSize>("m");
    const [webcamPosition, setWebcamPosition] = useState<{ x: number, y: number }>({
        x: CANVAS_WIDTH - 450, // Default bottom right approx
        y: CANVAS_HEIGHT - 450
    });

    // --- External Hooks ---
    const {
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,
        webcamVideoRef,
        screenVideoRef,
        microphoneStreamRef,
        startCamera,
        toggleCamera,
        toggleMic,
        startScreen,
        stopScreen,
        stopAll: stopAllStreams
    } = useStreams({
        onScreenEnded: () => {
            // Native Stop Button clicked
            console.log("Native stop detected");
            // If recording, we should probably stop recording or at least pause?
            // For now, let's just stop if we are recording.
            if (fsmRef.current.state === "recording") {
                stopRecordingWrapper();
            }
        }
    });

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    // We need a stream to record. The canvas capture stream + audio.
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

    // --- Recording Hook ---
    const {
        isRecording: isMediaRecording,
        startRecording: startMediaRecording,
        stopRecording: stopMediaRecording,
        recordingDuration
    } = useRecording({
        onComplete: (blob) => {
            console.log("Recording complete", blob.size);
            const url = URL.createObjectURL(blob);

            // Cleanup
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            stopAllStreams();

            fsmRef.current.transition("completed");
            updateState({
                status: "completed",
                recordedBlob: blob,
                recordedVideoUrl: url,
                recordingDuration
            });
        },
        onError: (err) => {
            console.error("Recording error", err);
            fsmRef.current.transition("error");
            updateState({ status: "error", error: err });
        }
    });


    // --- Helper to update state from FSM ---
    const updateState = (overrides?: Partial<BunnyRecordingState>) => {
        setState((prev) => ({
            ...prev,
            status: fsmRef.current.state,
            isRecording: fsmRef.current.state === "recording" || fsmRef.current.state === "stopping",
            recordingDuration: recordingDuration || prev.recordingDuration, // Sync duration
            ...overrides,
        }));
    };




    // --- Render Loop (Heartbeat Driven) ---
    const renderFrame = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        // 1. Clear
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // 1. Draw Background
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, backgroundImageElementRef.current || background);

        // 2. Draw Screen (Contain Mode)
        if (screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
            const video = screenVideoRef.current;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const videoRatio = vw / vh;
            const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

            let drawW, drawH, drawX, drawY;

            if (videoRatio > canvasRatio) {
                // Video is wider match width
                drawW = CANVAS_WIDTH;
                drawH = CANVAS_WIDTH / videoRatio;
                drawX = 0;
                drawY = (CANVAS_HEIGHT - drawH) / 2;
            } else {
                // Video is taller match height
                drawH = CANVAS_HEIGHT;
                drawW = CANVAS_HEIGHT * videoRatio;
                drawX = (CANVAS_WIDTH - drawW) / 2;
                drawY = 0;
            }

            // Draw screen with shadow to separate from background
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 20;
            ctx.drawImage(video, 0, 0, vw, vh, drawX, drawY, drawW, drawH);
            ctx.restore();
        } else {
            // Placeholder text if needed, or just let background show
        }

        // 3. Draw Camera (Draggable & Configurable)
        if (webcamVideoRef.current && webcamVideoRef.current.readyState >= 2 && cameraEnabled) {
            const sizeMap = { s: 240, m: 350, l: 480 };
            const size = sizeMap[webcamSize];
            const { x, y } = webcamPosition;

            ctx.save();
            ctx.beginPath();

            if (webcamShape === "circle") {
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            } else if (webcamShape === "square") {
                ctx.rect(x, y, size, size);
            } else if (webcamShape === "rounded_square") {
                ctx.roundRect(x, y, size, size, 40);
            }

            ctx.clip();

            // Draw video (Cover)
            const vw = webcamVideoRef.current.videoWidth;
            const vh = webcamVideoRef.current.videoHeight;
            const va = vw / vh;
            // We want to cover the square 'size x size'
            // Since 'size' is square, aspect ratio target is 1
            let sx, sy, sw, sh;
            if (va > 1) { // Video Wider
                sw = vh; sh = vh;
                sx = (vw - sw) / 2; sy = 0;
            } else { // Video Taller
                sw = vw; sh = vw;
                sx = 0; sy = (vh - sh) / 2;
            }

            ctx.drawImage(webcamVideoRef.current, sx, sy, sw, sh, x, y, size, size);
            ctx.restore();

            // Border
            ctx.beginPath();
            if (webcamShape === "circle") {
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            } else if (webcamShape === "square") {
                ctx.rect(x, y, size, size);
            } else if (webcamShape === "rounded_square") {
                ctx.roundRect(x, y, size, size, 40);
            }
            ctx.lineWidth = 4;
            ctx.strokeStyle = "white"; // "rgba(255,255,255,0.2)"
            ctx.stroke();
        }

    }, [cameraEnabled, screenVideoRef, webcamVideoRef, background, webcamPosition, webcamSize, webcamShape]);


    // --- Recording Control ---

    // --- Continuous Rendering for Preview ---
    useEffect(() => {
        // 1. Init Canvas
        if (!canvasRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            ctxRef.current = canvas.getContext("2d", { alpha: false });
        }

        // 2. Start Worker for Tick
        if (!workerRef.current) {
            workerRef.current = new Worker(new URL("../../workers/heartbeat.worker.js", import.meta.url));
            workerRef.current.onmessage = (e) => {
                if (e.data === "tick") {
                    renderFrame();
                }
            };
            workerRef.current.postMessage("start");
        }

        // 3. Set Preview Stream (Canvas only)
        if (!recordingStream && canvasRef.current) {
            // We set this as "previewStream" effectively
            const stream = canvasRef.current.captureStream(30);
            setRecordingStream(stream);
        }

        return () => {
            // Cleanup on unmount?
            // Should we stop worker? Yes.
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []); // Run once on mount (renderFrame is stable? No, it depends on state. Worker calls renderFrameRef?)

    // Issue: renderFrame is a dependency. renderFrame depends on state.
    // If renderFrame changes, we don't need to restart worker, just ensure worker calls the *current* renderFrame.
    // But `worker.onmessage` is a closure. It captures `renderFrame`. 
    // We should use a ref for renderFrame or the Tick logic?

    const renderFrameRef = useRef(renderFrame);
    useEffect(() => {
        renderFrameRef.current = renderFrame;
    }, [renderFrame]);

    // Update worker listener to use ref
    useEffect(() => {
        if (!workerRef.current) return;
        workerRef.current.onmessage = (e) => {
            if (e.data === "tick") {
                renderFrameRef.current();
            }
        };
    }, [workerRef.current]); // Only if worker instance changes (which is rare/once)


    const startWorker = () => {
        // Deprecated or Reused?
        // We already start worker on mount.
        // Just ensure it is running?
        if (workerRef.current) workerRef.current.postMessage("start");
    };


    const startRecordingFn = async () => {
        if (!fsmRef.current.transition("initializing")) return;
        updateState();

        // Countdown
        setCountdownValue(3);
        for (let i = 3; i > 0; i--) {
            setCountdownValue(i);
            if (fsmRef.current.state !== "initializing") {
                setCountdownValue(null);
                return; // Cancelled
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        setCountdownValue(null);

        if (fsmRef.current.state !== "initializing") return;

        try {
            // 1. Init Canvas & Context
            if (!canvasRef.current) {
                const canvas = document.createElement("canvas");
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvasRef.current = canvas;
                ctxRef.current = canvas.getContext("2d", { alpha: false });
            }

            // 2. Init Audio Mixing
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const dest = audioCtx.createMediaStreamDestination();
            destNodeRef.current = dest;

            // Mix Mic
            if (micEnabled && microphoneStreamRef.current) {
                const micSource = audioCtx.createMediaStreamSource(microphoneStreamRef.current);
                // Add gain?
                const gain = audioCtx.createGain();
                gain.gain.value = 1.0;
                micSource.connect(gain).connect(dest);
            }
            // Mix Screen Audio
            if (screenPreviewStream) {
                // If screen has audio tracks. 
                // Note: screenPreviewStream is from useStreams.
                const tracks = screenPreviewStream.getAudioTracks();
                if (tracks.length > 0) {
                    const screenAudio = new MediaStream(tracks);
                    const screenSource = audioCtx.createMediaStreamSource(screenAudio);
                    const gain = audioCtx.createGain();
                    gain.gain.value = 0.8;
                    screenSource.connect(gain).connect(dest);
                }
            }

            // 3. Create Final Stream
            const canvasStream = canvasRef.current.captureStream(30);
            const finalStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);

            setRecordingStream(finalStream);

            // 4. Start Heartbeat
            startWorker();

            // 5. Start MediaRecorder
            startMediaRecording(finalStream);

            fsmRef.current.transition("recording");
            updateState();

        } catch (e) {
            console.error("Failed to start", e);
            fsmRef.current.transition("error");
            updateState({ error: e as Error });
        }
    };

    const stopRecordingWrapper = () => {
        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        // Stop worker driving the frame headers
        if (workerRef.current) workerRef.current.postMessage("stop");

        // Stop MediaRecorder (which will trigger onComplete -> cleanup)
        stopMediaRecording();
    };

    // Sync duration from hook to state
    useEffect(() => {
        setState(p => ({ ...p, recordingDuration }));

        // Auto-stop limit
        if (state.isRecording && recordingDuration >= 120) {
            stopRecordingWrapper();
        }
    }, [recordingDuration, state.isRecording]);


    const cancelCountdown = () => {
        fsmRef.current.transition("idle");
        updateState();
        setCountdownValue(null);
    };

    const resetRecording = () => {
        setState({
            status: "idle",
            isRecording: false,
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
            error: null
        });
        fsmRef.current = new RecordingStateMachine();
        setCountdownValue(null);
        // Clean streams handled by UI usually? Or should we close them?
        // Usually user might want to keep camera open for next take.
        // But let's assume valid state is idle with permissions still there.
    };


    return {
        // State
        status: state.status,
        isRecording: state.isRecording,
        recordingDuration: state.recordingDuration,
        recordedVideoUrl: state.recordedVideoUrl,
        recordedBlob: state.recordedBlob,
        error: state.error,

        // Permissions & Streams (Passthrough)
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,
        // Provide a combined preview stream if needed? 
        // The UI uses 'previewStream' for the main big monitor. 
        // If not recording, it's null. If recording, it's the canvas stream?
        // In the old code: "previewStream" was the canvas stream during recording.
        previewStream: recordingStream,

        // Actions
        requestCameraAndMic: startCamera, // Map to useStreams
        toggleCamera,
        toggleMic,
        toggleScreenShare: async () => {
            if (permissions.screen) stopScreen();
            else await startScreen();
        },

        startRecording: startRecordingFn,
        stopRecording: stopRecordingWrapper,
        resetRecording,

        // Metadata/Helpers
        canRecord: (cameraEnabled || permissions.screen),
        recordedSources: null, // Legacy? We are doing single file now? User asked for "MIME negotiation", maybe single file.
        // The existing code had "recordedSources" for separate blobs. 
        // New requirement says "onComplete(blob)". 
        // I will stick to single blob for simplicity as per requirement 2 "Call onComplete(blob)".

        MAX_RECORDING_DURATION: 120, // 2 mins
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        countdownValue,
        cancelCountdown,
        background,
        setBackground,
        webcamShape,
        setWebcamShape,
        webcamSize,
        setWebcamSize,
        webcamPosition,
        setWebcamPosition,
        // Refs
        webcamVideoRef,
        screenVideoRef
    };
};
