"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Video, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { formatTime } from "./utils";

interface RecorderViewProps {
    status: "idle" | "recording" | "initializing" | "stopping" | "completed" | "error"; // broad to match
    webcamEnabled: boolean;
    previewStream: MediaStream | null;
    recordingDuration: number;
    MAX_RECORDING_DURATION: number;
    canvasDimensions: { width: number; height: number };
    setWebcamConfig: (config: { x: number; y: number; width: number; height: number }) => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onToggleWebcam: () => void;
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

    // --- Video Source ---
    useEffect(() => {
        if (!previewVideoRef.current) return;
        if (previewStream && (status === "idle" || status === "recording" || status === "initializing" || status === "stopping")) {
            previewVideoRef.current.srcObject = previewStream;
        } else {
            previewVideoRef.current.srcObject = null;
        }
    }, [previewStream, status]);

    const remainingTime = MAX_RECORDING_DURATION - recordingDuration;
    const isTimeRunningLow = remainingTime <= 10;

    return (
        <div className="flex flex-col h-full bg-[#202124] text-white overflow-hidden border border-white/10">
            {/* VIDEO AREA */}
            <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative">
                <div
                    ref={containerRef}
                    className="relative w-full max-w-6xl h-[calc(100vh-124px)] aspect-video bg-[#3c4043] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5 group"
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
                        <div
                            className={cn(
                                "absolute top-4 right-4 z-10 px-3 py-1.5 rounded-md font-mono text-sm font-medium backdrop-blur-md transition-colors duration-300 flex items-center gap-2",
                                isTimeRunningLow ? "bg-red-500/90 text-white animate-pulse" : "bg-black/40 text-white"
                            )}
                        >
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
                            {/* This div represents the webcam overlay area where dragging is captured */}
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
            <ControlBar
                status={status}
                onStartRecording={onStartRecording}
                onStopRecording={onStopRecording}
                webcamEnabled={webcamEnabled}
                onToggleWebcam={onToggleWebcam}
                recordingDuration={recordingDuration}
                onReset={() => { }} // No-op for now as we don't have reset exposed in the hook yet
                onPause={() => { }} // No-op
                onDelete={() => { }} // No-op
            />
        </div>
    );
}
