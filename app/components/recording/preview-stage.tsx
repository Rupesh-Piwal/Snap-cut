import React from "react";
import { cn } from "@/lib/utils";

interface PreviewStageProps {
    mode: "canvas" | "video";
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    screenSourceRef: React.RefObject<HTMLVideoElement | null>;
    cameraSourceRef: React.RefObject<HTMLVideoElement | null>;
    className?: string; // For layout (e.g. absolute inset-0)
    // Optional: Pass through events if needed (pointer events for drag)
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onPointerLeave?: (e: React.PointerEvent) => void;
}

export function PreviewStage({
    mode,
    canvasRef,
    videoRef,
    screenSourceRef,
    cameraSourceRef,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave
}: PreviewStageProps) {

    // We render BOTH but toggle visibility to ensure persistence? 
    // Or conditionally render?
    // If we conditionally render, we might lose state or refs might detach if not careful.
    // However, the hooks manage refs.
    // Let's render both and hide one to be safe and smooth.

    return (
        <div className={cn("relative w-full h-full", className)}>
            {/* Hidden Sources for Canvas Drawing */}
            <div className="absolute opacity-0 pointer-events-none -z-50 w-0 h-0 overflow-hidden" aria-hidden="true">
                <video ref={screenSourceRef} autoPlay playsInline muted />
                <video ref={cameraSourceRef} autoPlay playsInline muted />
            </div>

            {/* Direct Video Mode */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                    "absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300",
                    mode === "video" ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Canvas Composition Mode */}
            <canvas
                ref={canvasRef}
                className={cn(
                    "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                    // Canvas needs pointer events for dragging
                    mode === "canvas" ? "opacity-100" : "opacity-0",
                    mode === "canvas" ? "pointer-events-auto" : "pointer-events-none"
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
                style={{ touchAction: "none" }}
            />
        </div>
    );
}
