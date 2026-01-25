"use client";

import React, { useState, useEffect } from "react";
import {
    Mic,
    Video,
    VideoOff,
    GripVertical,
    Square,
    RotateCcw,
    Pause,
    Trash2,
    Pen,
    MousePointer2,
    Target,
    Play
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlBarProps {
    status: "idle" | "dest" | "initializing" | "recording" | "stopping" | "completed" | "error";
    onStartRecording: () => void;
    onStopRecording: () => void;
    webcamEnabled: boolean;
    onToggleWebcam: () => void;
    recordingDuration?: number; // Pass duration for the timer if available
    onReset?: () => void;
    onPause?: () => void;
    onDelete?: () => void;
}

export function ControlBar({
    status,
    onStartRecording,
    onStopRecording,
    webcamEnabled,
    onToggleWebcam,
    recordingDuration = 0,
    onReset,
    onPause,
    onDelete,
}: ControlBarProps) {
    const [formattedTime, setFormattedTime] = useState("00:00");

    useEffect(() => {
        const mins = Math.floor(recordingDuration / 60);
        const secs = recordingDuration % 60;
        setFormattedTime(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, [recordingDuration]);

    if (status === "idle") {
        return (
            <div className="h-24 flex items-center justify-center">
                <button
                    onClick={onStartRecording}
                    className="group relative flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:scale-105"
                >
                    <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
                    <span className="font-semibold text-lg">Start Recording</span>
                </button>
            </div>
        );
    }

    return (
        <div className="h-24 flex items-center justify-center pointer-events-none">
            {/* Floating Bar Container */}
            <div className="pointer-events-auto bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-2 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-500">


                {/* Main Controls Group */}
                <div className="flex items-center bg-[#F3F4F6] rounded-full px-1.5 py-1.5 gap-1">
                    {/* Stop Button */}
                    <button
                        onClick={onStopRecording}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-red-600 group"
                        title="Stop Recording"
                    >
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-400/50 rounded-full group-hover:bg-red-100 transition-colors">
                            <div className="w-3.5 h-3.5 bg-white rounded-[2px] shadow-sm transform group-hover:scale-110 transition-transform" />
                        </div>
                    </button>

                    {/* Timer */}
                    <div className="px-3 font-mono text-gray-700 font-medium min-w-[60px] text-center select-none">
                        {formattedTime}
                    </div>

                    {/* Restart */}
                    <button
                        onClick={onReset}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all"
                        title="Restart"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Pause */}
                    <button
                        onClick={onPause}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all"
                        title="Pause"
                    >
                        <Pause className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                        onClick={onDelete}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-white hover:shadow-sm transition-all"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200" />

                {/* Tools Group */}
                <div className="text-gray-400">
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                        <Pen className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200" />

                {/* Toggles Group */}
                <div className="flex items-center gap-2 pr-1">
                    {/* Cam Toggle (Mapped to Pen/Tools area in image? I will keep it separate or next to Mic as it is essential) */}
                    {/* The image doesn't explicitly show cam, but we need it. I'll make it subtle or similar to Mic */}
                    <button
                        onClick={onToggleWebcam}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
                            webcamEnabled
                                ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        )}
                        title="Toggle Webcam"
                    >
                        {webcamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>

                    {/* Mic Toggle */}
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-600 cursor-pointer hover:bg-green-200 transition-colors">
                        <Mic className="w-5 h-5" />
                    </div>
                </div>

            </div>
        </div>
    );
}
