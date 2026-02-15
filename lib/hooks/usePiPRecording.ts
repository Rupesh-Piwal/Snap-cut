import { useState, useRef, useEffect, useCallback } from "react";
import { RecordingStateMachine } from "../recording-state-machine";
import { useStreams } from "./useStreams";
import { useRecording } from "./useRecording";
import { usePreviewRenderer } from "./usePreviewRenderer";
import { BunnyRecordingState, WebcamShape, WebcamSize } from "../types";
import { BackgroundOption, NO_BACKGROUND } from "../backgrounds";

// Configuration
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

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
        microphoneStreamRef,
        startCamera,
        toggleCamera,
        toggleMic,
        startScreen,
        stopScreen,
        stopAll: stopAllStreams
    } = useStreams({
        onScreenEnded: () => {
            console.log("Native stop detected");
            if (fsmRef.current.state === "recording") {
                stopRecordingWrapper();
            }
        }
    });

    // --- Preview Renderer Hook ---
    // This handles the canvas rendering loop or direct video assignment
    const {
        mixedStream: visualStream,
        canvasRef,
        videoRef: previewVideoRef,
        mode: previewMode,
        screenSourceRef,
        cameraSourceRef
    } = usePreviewRenderer({
        videoStream: screenPreviewStream,
        cameraStream: cameraEnabled ? webcamPreviewStream : null,
        background,
        layout: {
            shape: webcamShape,
            size: webcamSize,
            position: webcamPosition
        }
    });

    // --- Audio Mixing Refs ---
    const audioContextRef = useRef<AudioContext | null>(null);
    const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const [combinedStream, setCombinedStream] = useState<MediaStream | null>(null);

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

            // Cleanup Audio
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
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

    // --- Start/Stop Logic ---
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
            // Audio Mixing Setup
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const dest = audioCtx.createMediaStreamDestination();
            destNodeRef.current = dest;

            // 1. Mix Mic
            if (micEnabled && microphoneStreamRef.current) {
                const micSource = audioCtx.createMediaStreamSource(microphoneStreamRef.current);
                // Simple gain
                const gain = audioCtx.createGain();
                gain.gain.value = 1.0;
                micSource.connect(gain).connect(dest);
            }

            // 2. Mix Screen Audio (System Audio)
            // Note: screenPreviewStream might have audio tracks
            if (screenPreviewStream) {
                const tracks = screenPreviewStream.getAudioTracks();
                if (tracks.length > 0) {
                    const screenAudio = new MediaStream(tracks);
                    const screenSource = audioCtx.createMediaStreamSource(screenAudio);
                    const gain = audioCtx.createGain();
                    gain.gain.value = 0.8;
                    screenSource.connect(gain).connect(dest);
                }
            }

            // 3. Combine Visual + Audio
            // visualStream comes from usePreviewRenderer (either canvas stream or direct video stream)
            // If visualStream is null (shouldn't be if we are starting), use empty?
            if (!visualStream) throw new Error("No video stream available");

            const finalStream = new MediaStream([
                ...visualStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);

            setCombinedStream(finalStream);

            // 4. Start Recording
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
        stopMediaRecording();
    };

    // Sync duration
    useEffect(() => {
        setState(p => ({ ...p, recordingDuration }));
        if (state.isRecording && recordingDuration >= 120) {
            stopRecordingWrapper();
        }
    }, [recordingDuration, state.isRecording]);


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

        // Preview Props for UI
        previewStream: visualStream, // Used for checking if ready
        previewMode,
        previewCanvasRef: canvasRef,

        previewVideoRef,
        screenSourceRef,
        cameraSourceRef,

        // Actions
        requestCameraAndMic: startCamera,
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
        MAX_RECORDING_DURATION: 120,
        canvasDimensions: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
        countdownValue,
        background,
        setBackground,
        webcamShape,
        setWebcamShape,
        webcamSize,
        setWebcamSize,
        webcamPosition,
        setWebcamPosition,
    };
};
