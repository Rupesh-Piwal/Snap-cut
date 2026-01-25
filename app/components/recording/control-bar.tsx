import React from "react";
import { Mic, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlBarProps {
    status: "idle" | "dest" | "initializing" | "recording" | "stopping" | "completed" | "error"; // broad type to be safe, or narrow it
    onStartRecording: () => void;
    onStopRecording: () => void;
    webcamEnabled: boolean;
    onToggleWebcam: () => void;
}

export function ControlBar({
    status,
    onStartRecording,
    onStopRecording,
    webcamEnabled,
    onToggleWebcam,
}: ControlBarProps) {
    return (
        <div className="h-24 shrink-0 flex items-center justify-center gap-4 pb-4 px-4 bg-[#202124]">
            {status === "idle" ? (
                <div className="flex flex-col items-center gap-2 group">
                    <button
                        onClick={onStartRecording}
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
                        onClick={onStopRecording}
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
                onClick={onToggleWebcam}
                offState={!webcamEnabled}
            />
        </div>
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
            <div
                className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200",
                    variant === "danger"
                        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                        : active
                            ? "bg-white/10 text-white hover:bg-white/20"
                            : "bg-transparent text-gray-400 hover:bg-white/5"
                )}
            >
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                {label}
            </span>
        </button>
    );
}
