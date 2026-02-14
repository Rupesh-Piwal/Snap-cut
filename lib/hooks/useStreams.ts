import { useState, useRef, useCallback, useEffect } from "react";
import { PermissionState, PermissionErrorType } from "../types";

// Configuration Constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const FRAME_RATE = 30;

interface UseStreamsProps {
    onScreenEnded?: () => void;
}

export function useStreams({ onScreenEnded }: UseStreamsProps = {}) {
    // --- State ---
    const [permissions, setPermissions] = useState<PermissionState>({
        camera: false,
        mic: false,
        screen: false,
    });

    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);

    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [permissionErrorType, setPermissionErrorType] = useState<PermissionErrorType>(null);

    const [webcamPreviewStream, setWebcamPreviewStream] = useState<MediaStream | null>(null);
    const [screenPreviewStream, setScreenPreviewStream] = useState<MediaStream | null>(null);

    // --- Refs ---
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);

    // --- Helpers ---
    const stopStreamTracks = (stream: MediaStream | null) => {
        if (!stream) return;
        stream.getTracks().forEach((t) => {
            t.stop();
            console.log(`[Lifecycle] Stopped track: ${t.kind} (${t.label})`);
        });
    };

    const handleError = (error: any, type: "camera" | "screen") => {
        console.warn(`[Permissions] ${type} Error:`, error);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setPermissionErrorType(type === "screen" ? "USER_CANCELLED" : "PERMISSION_BLOCKED");
            setPermissionError(
                type === "screen"
                    ? "Screen share was cancelled."
                    : "Permission denied. Check your browser settings."
            );
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            setPermissionErrorType("NO_DEVICE");
            setPermissionError("No device found.");
        } else {
            setPermissionErrorType("UNKNOWN");
            setPermissionError(error.message || `Failed to access ${type}.`);
        }
    };

    // --- Actions ---

    const startCamera = useCallback(async () => {
        console.log("[Streams] Requesting Camera & Mic...");
        setPermissionError(null);
        setPermissionErrorType(null);

        try {
            // 1. Clean up existing
            if (webcamStreamRef.current) stopStreamTracks(webcamStreamRef.current);
            if (microphoneStreamRef.current) stopStreamTracks(microphoneStreamRef.current);

            // 2. Request
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30, max: 30 },
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            console.log("[Streams] Camera Access Granted");

            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            // 3. Handle Video
            if (videoTrack) {
                const camStream = new MediaStream([videoTrack]);
                webcamStreamRef.current = camStream;
                setWebcamPreviewStream(camStream);
                setCameraEnabled(true);
                setPermissions((p) => ({ ...p, camera: true }));
            }

            // 4. Handle Audio
            if (audioTrack) {
                const micStream = new MediaStream([audioTrack]);
                microphoneStreamRef.current = micStream;
                setMicEnabled(true);
                setPermissions((p) => ({ ...p, mic: true }));
            }
        } catch (error: any) {
            handleError(error, "camera");
        }
    }, []);

    const stopCamera = useCallback(() => {
        console.log("[Streams] Stopping Camera");
        stopStreamTracks(webcamStreamRef.current);
        webcamStreamRef.current = null;
        setWebcamPreviewStream(null);
        setCameraEnabled(false);
        setPermissions((p) => ({ ...p, camera: false }));
    }, []);

    const toggleCamera = useCallback(async (enable: boolean) => {
        if (enable) await startCamera();
        else stopCamera();
    }, [startCamera, stopCamera]);

    const stopMic = useCallback(() => {
        console.log("[Streams] Stopping Mic");
        stopStreamTracks(microphoneStreamRef.current);
        microphoneStreamRef.current = null;
        setMicEnabled(false);
        setPermissions((p) => ({ ...p, mic: false }));
    }, []);

    const startMic = useCallback(async () => {
        // This is a bit tricky if we already have a stream.
        // Usually we get audio with video. If we want JUST audio, we request it.
        // For now, reuse startCamera logic or just separate if needed.
        // But the requirement says "startCamera call getUserMedia".
        // Let's stick to simple toggles for now.
        console.log("[Streams] Requesting Mic Only...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                const micStream = new MediaStream([audioTrack]);
                microphoneStreamRef.current = micStream;
                setMicEnabled(true);
                setPermissions((p) => ({ ...p, mic: true }));
            }
        } catch (e) {
            handleError(e, "camera"); // Reuse error handler
        }
    }, [])


    const toggleMic = useCallback(async (enable: boolean) => {
        if (enable) await startMic();
        else stopMic();
    }, [startMic, stopMic]);


    const stopScreen = useCallback(() => {
        console.log("[Streams] Stopping Screen");
        stopStreamTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setScreenPreviewStream(null);
        setPermissions((p) => ({ ...p, screen: false }));
        if (onScreenEnded) onScreenEnded();
    }, [onScreenEnded]);

    const startScreen = useCallback(async () => {
        console.log("[Streams] Requesting Screen Share...");
        setPermissionError(null);
        setPermissionErrorType(null);

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: CANVAS_WIDTH },
                    height: { ideal: CANVAS_HEIGHT },
                    frameRate: { ideal: FRAME_RATE, max: 30 },
                },
                audio: true,
            });

            screenStreamRef.current = displayStream;
            setScreenPreviewStream(displayStream);

            // Handle "Stop Sharing" bubble
            const videoTrack = displayStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.log("[Streams] Native Stop Sharing triggered");
                    stopScreen();
                };
            }

            setPermissions((p) => ({ ...p, screen: true }));
        } catch (error: any) {
            handleError(error, "screen");
            stopScreen(); // Cleanup if failed half-way
        }
    }, [stopScreen]);


    const stopAll = useCallback(() => {
        stopCamera();
        stopMic();
        stopScreen();
    }, [stopCamera, stopMic, stopScreen]);

    // --- Attach to Hidden Videos (Effect) ---
    // We expose refs so the consumer can attach them to video elements if needed,
    // OR we can manage creation internally.
    // The requirement says: "When stream updates: videoRef.current.srcObject = stream. This must be handled inside the hook using useEffect."
    // This implies the hook might create elements OR the component passes refs.
    // BUT: "hidden <video> elements" suggests they might be internal or the hook manages them.
    // To keep it simple and internal (as requested "Separate all stream-related logic"):
    // I will create the video elements inside the hook or just manage srcObject if refs are passed?
    // UsePiPRecording used `document.createElement("video")`. I should probably continue that pattern if I want to keep it logic-only.
    // OR, I can use a simpler approach: Just keep the elements in refs.

    useEffect(() => {
        if (!webcamVideoRef.current) {
            webcamVideoRef.current = document.createElement("video");
            webcamVideoRef.current.muted = true;
            webcamVideoRef.current.playsInline = true;
        }
        if (webcamVideoRef.current.srcObject !== webcamPreviewStream) {
            webcamVideoRef.current.srcObject = webcamPreviewStream;
            if (webcamPreviewStream) webcamVideoRef.current.play().catch(console.error);
        }
    }, [webcamPreviewStream]);

    useEffect(() => {
        if (!screenVideoRef.current) {
            screenVideoRef.current = document.createElement("video");
            screenVideoRef.current.muted = true;
            screenVideoRef.current.playsInline = true;
        }
        if (screenVideoRef.current.srcObject !== screenPreviewStream) {
            screenVideoRef.current.srcObject = screenPreviewStream;
            if (screenPreviewStream) screenVideoRef.current.play().catch(console.error);
        }
    }, [screenPreviewStream]);


    return {
        permissions,
        cameraEnabled,
        micEnabled,
        permissionError,
        permissionErrorType,
        webcamPreviewStream,
        screenPreviewStream,

        // Streams (internal refs but exposed if needed for advanced usage, though streams are better)
        webcamStreamRef,
        microphoneStreamRef,
        screenStreamRef,

        // Video Elements (needed for drawing to canvas)
        webcamVideoRef,
        screenVideoRef,

        startCamera,
        stopCamera,
        toggleCamera,
        startMic,
        stopMic,
        toggleMic,
        startScreen,
        stopScreen,
        stopAll
    };
}
