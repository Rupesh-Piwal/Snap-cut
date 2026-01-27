import { useState, useRef, useEffect, useCallback } from "react";
import {
    createAudioMixer,
    createRecordingBlob,
    setupRecording,
    calculateRecordingDuration,
    cleanupRecording,
} from "../record-utils";
import { BunnyRecordingState, RecordingState } from "../types";
import { RecordingStateMachine } from "../recording-state-machine"; // Import the FSM

// Configuration Constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const FRAME_RATE = 60;
const WEBCAM_WIDTH = 320;
const PADDING = 20;
const MAX_RECORDING_DURATION = 120; // 2 minutes strict limit

export interface WebcamConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const usePiPRecording = () => {
    // 1. State Management via FSM
    // We use a ref for the FSM to ensure it persists across renders
    const fsmRef = useRef<RecordingStateMachine>(new RecordingStateMachine());

    // React state reflects the persistent FSM state + data
    const [state, setState] = useState<BunnyRecordingState>({
        status: "idle",
        isRecording: false,
        recordedBlob: null,
        recordedVideoUrl: "",
        recordingDuration: 0,
        error: null,
    });

    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // Refs for Resources
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const backgroundIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Stream Refs
    const screenStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

    // Webcam Config
    const webcamConfigRef = useRef<WebcamConfig>({
        x: CANVAS_WIDTH - WEBCAM_WIDTH - PADDING,
        y: CANVAS_HEIGHT - WEBCAM_WIDTH - PADDING,
        width: WEBCAM_WIDTH,
        height: WEBCAM_WIDTH
    });

    // --- Helper: Sync FSM to React State ---
    const updateState = useCallback(() => {
        const currentStatus = fsmRef.current.state;
        setState(prev => ({
            ...prev,
            status: currentStatus,
            isRecording: currentStatus === "recording" || currentStatus === "stopping",
        }));
    }, []);

    // Subscribe to FSM changes
    useEffect(() => {
        const unsubscribe = fsmRef.current.subscribe(updateState);
        return () => unsubscribe();
    }, [updateState]);


    const setWebcamConfig = useCallback((config: Partial<WebcamConfig>) => {
        webcamConfigRef.current = { ...webcamConfigRef.current, ...config };
    }, []);



    // Step 1: Pre-request webcam permission
    // When user clicks Start Recording (before screen picker): 
    // stream.getTracks().forEach(track => track.stop());

    // Step 2: Then request screen capture



    // --------------------- //

    let lastFrameTs = performance.now();

    // --------------------- //

    // --- Drawing Loop (Same as before) ---
    const drawFrame = useCallback(() => {
        const now = performance.now();
        const delta = now - lastFrameTs;
        lastFrameTs = now;

        console.log("rAF delta(ms):", Math.round(delta));



        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        const screenVideo = screenVideoRef.current;
        const webcamVideo = webcamVideoRef.current;

        if (!ctx || !canvas || !screenVideo) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(screenVideo, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (webcamVideo && webcamVideo.readyState === 4 && webcamVideo.srcObject) {
            const { x, y, width, height } = webcamConfigRef.current;
            const size = Math.min(width, height);
            const radius = size / 2;
            const cx = x + radius;
            const cy = y + radius;

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();

            // Shadow
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 4;
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            ctx.clip();

            // Draw Video (Cover)
            const vw = webcamVideo.videoWidth;
            const vh = webcamVideo.videoHeight;
            const videoAspect = vw / vh;
            const destAspect = 1;

            let sx = 0, sy = 0, sw = vw, sh = vh;

            if (videoAspect > destAspect) {
                sw = vh * destAspect;
                sx = (vw - sw) / 2;
            } else {
                sh = vw / destAspect;
                sy = (vh - sh) / 2;
            }

            ctx.drawImage(webcamVideo, sx, sy, sw, sh, x, y, size, size);
            ctx.restore();

            // Border
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "white";
            ctx.stroke();
            ctx.restore();
        }

        animationFrameRef.current = requestAnimationFrame(drawFrame);
    }, []);

    // --- Robust Cleanup ---
    const cleanup = useCallback(() => {
        // 1. Stop Animation Loops
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (backgroundIntervalRef.current) {
            clearInterval(backgroundIntervalRef.current);
            backgroundIntervalRef.current = null;
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // 2. Stop MediaRecorder (Ensure called once)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.warn("MediaRecorder stop failed (may be already stopped):", e);
            }
        }

        // 3. Stop All Tracks (Hardware Release)
        const stopTracks = (stream: MediaStream | null) => {
            stream?.getTracks().forEach(t => t.stop());
        };
        stopTracks(screenStreamRef.current);
        stopTracks(webcamStreamRef.current);
        stopTracks(microphoneStreamRef.current);

        // Also stop the preview stream if it exists
        if (state.status !== "recording") {
            // Only nullify preview if completely done/reset, but for now we keep it? 
            // Actually, if we're done, we should probably stop the mix stream too.
        }
        // In this architecture, previewStream IS the mix.

        // 4. Close Audio Context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        // 5. Release Video Elements
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
            screenVideoRef.current.load(); // Force release
            screenVideoRef.current = null;
        }
        if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = null;
            webcamVideoRef.current.load(); // Force release
            webcamVideoRef.current = null;
        }

    }, [state.status]); // Depend on status to know when to kill things? Actually cleanup should be idempotent.

    // --- Start Recording ---
    const startRecording = async (withWebcam: boolean = true, withMic: boolean = true) => {
        // Enforce FSM Transition
        if (!fsmRef.current.transition("initializing")) return;
        updateState();

        try {
            cleanup(); // Ensure fresh start
            setState(prev => ({
                ...prev,
                recordedVideoUrl: "",
                recordedBlob: null,
                error: null
            }));

            // STEP 1: Preflight permissions BEFORE screen capture
            // This prevents the poor UX where user has to switch tabs to grant permission
            // after getDisplayMedia() steals focus to the captured screen.
            if (withWebcam || withMic) {
                try {
                    const preflightStream = await navigator.mediaDevices.getUserMedia({
                        video: withWebcam ? { width: 1280, height: 720 } : false,
                        audio: withMic,
                    });
                    // Immediately stop all tracks - we only needed permission grant
                    preflightStream.getTracks().forEach(track => track.stop());
                    console.log("Permission preflight successful");
                } catch (err) {
                    console.warn("Permission preflight failed:", err);
                    // Continue without webcam/mic if permission denied
                }
            }

            // STEP 2: Get screen capture (this steals focus to captured screen)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: CANVAS_WIDTH },
                    height: { ideal: CANVAS_HEIGHT },
                    frameRate: { ideal: FRAME_RATE },
                },
                audio: true, // We still want system audio if available
            });
            screenStreamRef.current = displayStream;

            // Handle user clicking "Stop Sharing" in browser UI
            displayStream.getVideoTracks()[0].onended = () => {
                performStop();
            };

            // STEP 3: Re-acquire user streams for actual recording (permission already granted)
            let userStream: MediaStream | null = null;
            if (withWebcam || withMic) {
                try {
                    userStream = await navigator.mediaDevices.getUserMedia({
                        video: withWebcam ? { width: 1280, height: 720 } : false,
                        audio: withMic,
                    });
                    if (withWebcam) webcamStreamRef.current = userStream;
                    if (withMic) microphoneStreamRef.current = userStream;
                } catch (err) {
                    console.warn("User stream acquisition failed:", err);
                }
            }

            // 2. Setup Decoders
            const sVideo = document.createElement("video");
            sVideo.srcObject = displayStream;
            sVideo.muted = true;
            sVideo.playsInline = true;
            await sVideo.play();
            screenVideoRef.current = sVideo;

            if (userStream) {
                const wVideo = document.createElement("video");
                wVideo.srcObject = new MediaStream(userStream.getVideoTracks());
                wVideo.muted = true;
                wVideo.playsInline = true;
                await wVideo.play();
                webcamVideoRef.current = wVideo;
            }

            // 3. Setup Canvas
            const canvas = document.createElement("canvas");
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            canvasRef.current = canvas;
            ctxRef.current = canvas.getContext("2d", { alpha: false }); // Opt: alpha false

            // Start Loops
            drawFrame();
            backgroundIntervalRef.current = setInterval(() => {
                if (document.hidden) drawFrame();
            }, 100);

            // 4. Audio Mixing
            const hasDisplayAudio = displayStream.getAudioTracks().length > 0;
            audioContextRef.current = new AudioContext();
            const mixedDest = createAudioMixer(
                audioContextRef.current,
                displayStream,
                userStream,
                hasDisplayAudio
            );

            // 5. Final Stream
            const canvasStream = canvas.captureStream(FRAME_RATE);
            const finalStream = new MediaStream();
            canvasStream.getVideoTracks().forEach(t => finalStream.addTrack(t));

            if (mixedDest) {
                mixedDest.stream.getAudioTracks().forEach(t => finalStream.addTrack(t));
            } else {
                displayStream.getAudioTracks().forEach(t => finalStream.addTrack(t));
                userStream?.getAudioTracks().forEach(t => finalStream.addTrack(t));
            }

            setPreviewStream(finalStream);

            // 6. MediaRecorder
            chunksRef.current = [];
            mediaRecorderRef.current = setupRecording(finalStream, {
                onDataAvailable: (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                },
                onStop: () => {
                    // This fires when mediaRecorder.stop() is called
                    const { blob, url } = createRecordingBlob(chunksRef.current);

                    // FSM: Stopping -> Completed
                    if (fsmRef.current.transition("completed")) {
                        setState(prev => ({
                            ...prev,
                            recordedBlob: blob,
                            recordedVideoUrl: url,
                        }));
                    }
                    cleanup(); // Full release
                }
            });

            // 7. START
            mediaRecorderRef.current.start(1000); // 1s slices
            startTimeRef.current = Date.now();

            if (fsmRef.current.transition("recording")) {
                updateState();
                startTimer();
            }

        } catch (error) {
            console.error("Start failed:", error);
            fsmRef.current.transition("error");
            setState(prev => ({ ...prev, error: error as Error }));
            cleanup();
        }
    };

    // --- Timer & Auto-Stop ---
    const startTimer = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        timerIntervalRef.current = setInterval(() => {
            if (!startTimeRef.current) return;
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

            setState(prev => ({ ...prev, recordingDuration: duration }));

            // AUTO-STOP ENFORCEMENT
            if (duration >= MAX_RECORDING_DURATION) {
                performStop();
            }
        }, 1000);
    };

    // --- Stop Logic ---
    const performStop = useCallback(() => {
        // Only proceed if we are recording
        if (!fsmRef.current.transition("stopping")) return;
        updateState();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            // The onstop handler (defined in start) will finalize the state
        } else {
            // If recorder already stopped (e.g. error), force complete
            cleanup();
            fsmRef.current.transition("completed");
            updateState();
        }
    }, [updateState, cleanup]); // cleanup is stable

    const stopRecording = () => {
        performStop();
    };

    const resetRecording = useCallback(() => {
        if (state.recordedVideoUrl) {
            URL.revokeObjectURL(state.recordedVideoUrl);
        }
        fsmRef.current.transition("idle");
        updateState();
        setState(prev => ({
            ...prev,
            recordedBlob: null,
            recordedVideoUrl: "",
            recordingDuration: 0,
            error: null
        }));
        setPreviewStream(null);
    }, [state.recordedVideoUrl, updateState]);

    const toggleWebcam = useCallback(async (shouldEnable: boolean) => {
        // ... (Same webcam toggle logic, can implement later or keep existing)
        // For brevity ensuring core loop is correct first. 
        // Keeping it basically the same but safe:
        try {
            if (shouldEnable) {
                if (webcamVideoRef.current && webcamVideoRef.current.srcObject) return;
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: false
                });
                webcamStreamRef.current = stream;

                let wVideo = webcamVideoRef.current;
                if (!wVideo) {
                    wVideo = document.createElement("video");
                    wVideo.muted = true;
                    wVideo.playsInline = true;
                    webcamVideoRef.current = wVideo;
                }
                wVideo.srcObject = stream;
                await wVideo.play();
            } else {
                if (webcamStreamRef.current) {
                    webcamStreamRef.current.getVideoTracks().forEach(t => t.stop());
                    webcamStreamRef.current = null;
                }
                if (webcamVideoRef.current) {
                    webcamVideoRef.current.srcObject = null;
                }
            }
        } catch (error) {
            console.error("Webcam toggle error", error);
        }
    }, []);

    // Initial Cleanup on Mount
    useEffect(() => {
        return () => cleanup();
    }, []);

    return {
        ...state,
        previewStream,
        startRecording,
        stopRecording,
        resetRecording,
        setWebcamConfig,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        toggleWebcam,
        MAX_RECORDING_DURATION
    };
};
