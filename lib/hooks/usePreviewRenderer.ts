import { useState, useEffect, useRef, useCallback } from "react";
import { BackgroundOption } from "../backgrounds";
import { WebcamShape, WebcamSize } from "../types";
import { drawBackground } from "../layouts/layout-engine";

// Configuration
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

interface UsePreviewRendererProps {
    videoStream: MediaStream | null;
    cameraStream: MediaStream | null; // cameraEnabled check is done before passing this
    background: BackgroundOption;
    layout: {
        shape: WebcamShape;
        size: WebcamSize;
        position: { x: number; y: number };
    };
    quality?: "native" | "canvas"; // Force canvas if needed
}

interface PreviewResult {
    mixedStream: MediaStream | null;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    screenSourceRef: React.RefObject<HTMLVideoElement | null>;
    cameraSourceRef: React.RefObject<HTMLVideoElement | null>;
    mode: "canvas" | "video";
    status: "active" | "inactive";
}

export function usePreviewRenderer({
    videoStream,
    cameraStream,
    background,
    layout,
    quality = "native",
}: UsePreviewRendererProps): PreviewResult {
    // --- State ---
    const [mixedStream, setMixedStream] = useState<MediaStream | null>(null);
    const [mode, setMode] = useState<"canvas" | "video">("video");

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null); // For direct mode
    const workerRef = useRef<Worker | null>(null);

    // Internal refs for loop access without dependencies
    const streamsRef = useRef({ video: videoStream, camera: cameraStream });
    const configRef = useRef({ background, layout });
    const bgImageRef = useRef<HTMLImageElement | null>(null);

    // --- Sync Refs ---
    useEffect(() => {
        streamsRef.current = { video: videoStream, camera: cameraStream };
    }, [videoStream, cameraStream]);

    useEffect(() => {
        configRef.current = { background, layout };
    }, [background, layout]);

    // --- Preload Background ---
    useEffect(() => {
        if (background.type === "image" && background.value) {
            const img = new Image();
            img.src = background.value;
            img.crossOrigin = "anonymous";
            img.onload = () => { bgImageRef.current = img; };
        } else {
            bgImageRef.current = null;
        }
    }, [background]);

    // --- Determine Mode ---
    useEffect(() => {
        const hasCamera = !!cameraStream;
        const hasBackground = background.type !== "none";
        const forceCanvas = quality === "canvas";

        // Logic: Use Canvas if composition is needed
        if (hasCamera || hasBackground || forceCanvas) {
            setMode("canvas");
        } else {
            setMode("video");
        }
    }, [cameraStream, background, quality]);


    // --- Source Video Management ---
    // We need to render these in the UI so the browser manages their playback lifecycle correctly.
    const screenSourceRef = useRef<HTMLVideoElement | null>(null);
    const cameraSourceRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const vid = screenSourceRef.current;
        console.log("[PreviewRenderer] Setting screen source", !!vid, !!videoStream);
        if (vid && vid.srcObject !== videoStream) {
            vid.srcObject = videoStream;
            if (videoStream) {
                vid.play().then(() => console.log("[PreviewRenderer] Screen playing")).catch(e => console.error("[PreviewRenderer] Screen play failed", e));
            }
        }
    }, [videoStream]);

    useEffect(() => {
        const vid = cameraSourceRef.current;
        console.log("[PreviewRenderer] Setting camera source", !!vid, !!cameraStream);
        if (vid && vid.srcObject !== cameraStream) {
            vid.srcObject = cameraStream;
            if (cameraStream) {
                vid.play().then(() => console.log("[PreviewRenderer] Camera playing")).catch(e => console.error("[PreviewRenderer] Camera play failed", e));
            }
        }
    }, [cameraStream]);


    // --- Render Loop Implementation ---
    const frameCountRef = useRef(0);
    const renderFrame = useCallback(() => {
        frameCountRef.current++;

        // Critical Fix: Ensure context matches the current canvas ref (which React might have updated)
        const canvas = canvasRef.current;
        let ctx = ctxRef.current;

        if (canvas) {
            if (!ctx || ctx.canvas !== canvas) {
                console.log("[PreviewRenderer] Updating context to match canvas ref", canvas.width, canvas.height);
                ctx = canvas.getContext("2d", { alpha: false });
                ctxRef.current = ctx;

                // Also update mixed stream if needed? 
                // We rely on the useEffect(mode) to catch up, but it might miss this switch if mode didn't change.
                // Ideally we should trigger a stream update here, but let's fix visual first.
            }
        }

        if (!ctx) return;

        if (frameCountRef.current % 60 === 0) {
            // console.log("[PreviewRenderer] Rendering frame", frameCountRef.current);
        }

        const { background: bg, layout: lay } = configRef.current;

        // Ensure canvas size matches if it was resized or created
        if (canvas && (canvas.width !== CANVAS_WIDTH || canvas.height !== CANVAS_HEIGHT)) {
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
        }

        // 1. Clear & Background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, bgImageRef.current || bg);

        // 2. Draw Screen
        const screenVid = screenSourceRef.current;
        if (screenVid) {
            if (screenVid.readyState >= 2) {
                // Contain rendering
                const vw = screenVid.videoWidth;
                const vh = screenVid.videoHeight;
                const videoRatio = vw / vh;
                const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
                let dw, dh, dx, dy;

                if (videoRatio > canvasRatio) {
                    dw = CANVAS_WIDTH; dh = CANVAS_WIDTH / videoRatio;
                    dx = 0; dy = (CANVAS_HEIGHT - dh) / 2;
                } else {
                    dh = CANVAS_HEIGHT; dw = CANVAS_HEIGHT * videoRatio;
                    dx = (CANVAS_WIDTH - dw) / 2; dy = 0;
                }

                ctx.save();
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 20;
                ctx.drawImage(screenVid, 0, 0, vw, vh, dx, dy, dw, dh);
                ctx.restore();
            } else {
                if (frameCountRef.current % 60 === 0) console.log("[PreviewRenderer] Screen video not ready (throttled)", screenVid.readyState);
            }
        }

        // 3. Draw Camera
        const camVid = cameraSourceRef.current;
        const { camera } = streamsRef.current;

        if (camera && camVid) {
            if (camVid.readyState >= 2) {
                const sizeMap = { s: 240, m: 350, l: 480 };
                const size = sizeMap[lay.size];
                const { x, y } = lay.position;
                const shape = lay.shape;

                ctx.save();

                // Shadow for depth/premium feel
                ctx.shadowColor = "rgba(0,0,0,0.25)";
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 8;

                ctx.beginPath();
                if (shape === "circle") ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                else if (shape === "square") ctx.rect(x, y, size, size);
                else if (shape === "rounded_square") ctx.roundRect(x, y, size, size, 40);

                // Fill with black first to ensure shadow is cast even if video is transparent/loading
                ctx.fillStyle = "#000";
                ctx.fill();

                ctx.clip();

                // Cover rendering for camera
                const vw = camVid.videoWidth;
                const vh = camVid.videoHeight;
                const va = vw / vh;
                let sx, sy, sw, sh;
                if (va > 1) { sw = vh; sh = vh; sx = (vw - sw) / 2; sy = 0; }
                else { sw = vw; sh = vw; sx = 0; sy = (vh - sh) / 2; }

                ctx.drawImage(camVid, sx, sy, sw, sh, x, y, size, size);
                ctx.restore();

                // REMOVED BORDER STROKE AS REQUESTED
                // Clean, bezel-less look
            } else {
                if (frameCountRef.current % 60 === 0) console.log("[PreviewRenderer] Camera video not ready (throttled)", camVid.readyState);
            }
        }

    }, []);

    // --- Worker Lifecycle ---
    const renderRef = useRef(renderFrame);
    useEffect(() => { renderRef.current = renderFrame; }, [renderFrame]);

    useEffect(() => {
        if (mode === "canvas") {
            // Start Worker
            if (!workerRef.current) {
                console.log("[PreviewRenderer] Creating worker...");
                try {
                    const worker = new Worker(new URL("../../workers/heartbeat.worker.js", import.meta.url));
                    worker.onmessage = (e) => {
                        if (e.data === "tick") {
                            renderRef.current();
                        } else {
                            console.log("[PreviewRenderer] Worker message:", e.data);
                        }
                    };
                    worker.onerror = (e) => {
                        console.error("[PreviewRenderer] Worker error:", e);
                    };
                    worker.postMessage("start");
                    console.log("[PreviewRenderer] Worker started");
                    workerRef.current = worker;
                } catch (e) {
                    console.error("[PreviewRenderer] Failed to create worker:", e);
                }
            }
        } else {
            // Stop Worker
            if (workerRef.current) {
                console.log("[PreviewRenderer] Terminating worker");
                workerRef.current.terminate();
                workerRef.current = null;
            }
        }
    }, [mode]);

    // --- Cleanup ---
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    // --- Output Stream Management ---
    useEffect(() => {
        if (mode === "canvas") {
            // Setup Canvas Stream
            if (!canvasRef.current) {
                // Initialize canvas only if needed
                const canvas = document.createElement("canvas");
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                canvasRef.current = canvas;
                ctxRef.current = canvas.getContext("2d", { alpha: false });
            }
            if (canvasRef.current) {
                const stream = canvasRef.current.captureStream(30);
                setMixedStream(stream);
            }
        } else {
            // Direct mode: Mixed stream IS the video stream
            setMixedStream(videoStream);
        }
    }, [mode, videoStream]);


    // --- Direct Video Ref Management ---
    useEffect(() => {
        if (mode === "video" && videoRef.current && videoStream) {
            if (videoRef.current.srcObject !== videoStream) {
                videoRef.current.srcObject = videoStream;
                videoRef.current.play().catch(() => { });
            }
        } else if (mode === "canvas" && videoRef.current) {
            // In canvas mode, the main video ref (if visible) might want to show nothing or the canvas should take over
            videoRef.current.srcObject = null;
        }
    }, [mode, videoStream]);


    return {
        mixedStream,
        canvasRef,
        videoRef,
        screenSourceRef,
        cameraSourceRef,
        mode,
        status: (videoStream || cameraStream) ? "active" : "inactive"
    };
}
