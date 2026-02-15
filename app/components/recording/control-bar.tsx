"use client";

import { useState, useEffect, useRef } from "react";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MonitorOff,
    X,
    Palette,
    Check,
    Circle,
    Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundOption, BACKGROUND_IMAGES, NO_BACKGROUND } from "@/lib/backgrounds";
import { WebcamShape, WebcamSize } from "@/lib/types";

export interface ControlBarProps {
    status:
    | "idle"
    | "dest"
    | "initializing"
    | "recording"
    | "stopping"
    | "completed"
    | "error";
    onStartRecording: () => void;
    onStopRecording: () => void;
    webcamEnabled: boolean;
    onToggleWebcam: () => void;
    micEnabled: boolean;
    onToggleMic: () => void;
    recordingDuration?: number;
    onReset?: () => void;
    onPause?: () => void;
    onDelete?: () => void;
    screenShareEnabled: boolean;
    onToggleScreenShare: () => void;
    canRecord: boolean;
    background: BackgroundOption;
    onSetBackground: (bg: BackgroundOption) => void;
    webcamShape: WebcamShape;
    onSetWebcamShape: (shape: WebcamShape) => void;
    webcamSize: WebcamSize;
    onSetWebcamSize: (size: WebcamSize) => void;
}

export function ControlBar({
    status,
    onStartRecording,
    onStopRecording,
    webcamEnabled,
    onToggleWebcam,
    micEnabled,
    onToggleMic,
    screenShareEnabled,
    onToggleScreenShare,
    canRecord,
    background,
    onSetBackground,
    webcamShape,
    onSetWebcamShape,
    webcamSize,
    onSetWebcamSize,
    onReset
}: ControlBarProps) {
    const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
    const [isCameraSettingsOpen, setIsCameraSettingsOpen] = useState(false);

    const backgroundRef = useRef<HTMLDivElement>(null);
    const cameraSettingsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (backgroundRef.current && !backgroundRef.current.contains(event.target as Node)) {
                setIsBackgroundOpen(false);
            }
            if (cameraSettingsRef.current && !cameraSettingsRef.current.contains(event.target as Node)) {
                setIsCameraSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const ControlButton = ({
        active,
        onClick,
        icon: Icon,
        offIcon: OffIcon,
        label,
        colorClass = "bg-white/10 text-white hover:bg-white/20",
        activeColorClass = "bg-white/20 text-white hover:bg-white/30",
    }: {
        active: boolean;
        onClick: () => void;
        icon: any;
        offIcon?: any;
        label: string;
        colorClass?: string;
        activeColorClass?: string;
    }) => (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-all duration-200 border border-transparent hover:border-white/5",
                active ? activeColorClass : colorClass
            )}
            title={label}
        >
            <div className="mb-1">
                {active ? <Icon className="w-5 h-5" /> : (OffIcon ? <OffIcon className="w-5 h-5 opacity-60" /> : <Icon className="w-5 h-5 opacity-60" />)}
            </div>
            <span className="text-[10px] font-medium opacity-80">{label}</span>
        </button>
    );

    return (
        <div className="flex items-center justify-center pb-8 relative z-50">

            {isBackgroundOpen && (
                <div
                    ref={backgroundRef}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#1A1B1D] border border-[#2E2E30] rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 w-[340px] z-50"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white text-sm font-semibold">Select Background</h3>
                        <button
                            onClick={() => setIsBackgroundOpen(false)}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        <button
                            onClick={() => {
                                onSetBackground(NO_BACKGROUND);
                            }}
                            className={cn(
                                "aspect-video rounded-lg border-2 overflow-hidden relative transition-all hover:scale-105",
                                background.id === "none" ? "border-blue-500" : "border-white/10 hover:border-white/30"
                            )}
                        >
                            <div className="absolute inset-0 bg-black flex items-center justify-center">
                                <span className="text-xs text-white/50">None</span>
                            </div>
                            {background.id === "none" && (
                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>

                        {BACKGROUND_IMAGES.map((bg) => (
                            <button
                                key={bg.id}
                                onClick={() => onSetBackground(bg)}
                                className={cn(
                                    "aspect-video rounded-lg border-2 overflow-hidden relative transition-all hover:scale-105",
                                    background.id === bg.id ? "border-blue-500" : "border-white/10 hover:border-white/30"
                                )}
                            >
                                <img
                                    src={bg.preview}
                                    alt={bg.label}
                                    className="w-full h-full object-cover"
                                />
                                {background.id === bg.id && (
                                    <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isCameraSettingsOpen && (
                <div
                    ref={cameraSettingsRef}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#1A1B1D] border border-[#2E2E30] rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 w-[280px] z-50"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-sm font-semibold">Webcam Settings</h3>
                        <button
                            onClick={() => setIsCameraSettingsOpen(false)}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs text-white/50 font-medium mb-2 block uppercase tracking-wider">Frame</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (!webcamEnabled) onToggleWebcam();
                                    onSetWebcamShape("circle");
                                }}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-lg border transition-all",
                                    webcamEnabled && webcamShape === "circle" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                                title="Circle"
                            >
                                <Circle className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (!webcamEnabled) onToggleWebcam();
                                    onSetWebcamShape("square");
                                }}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-lg border transition-all",
                                    webcamEnabled && webcamShape === "square" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                                title="Square"
                            >
                                <Square className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (!webcamEnabled) onToggleWebcam();
                                    onSetWebcamShape("rounded_square");
                                }}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-lg border transition-all",
                                    webcamEnabled && webcamShape === "rounded_square" ? "bg-blue-500/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                                title="Rounded"
                            >
                                <div className="w-5 h-5 border-2 border-current rounded-md" />
                            </button>
                            <button
                                onClick={() => {
                                    if (webcamEnabled) onToggleWebcam();
                                }}
                                className={cn(
                                    "flex items-center justify-center px-3 h-10 rounded-lg border transition-all ml-auto text-xs font-medium",
                                    !webcamEnabled ? "bg-red-500/20 border-red-500 text-red-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                            >
                                Disable
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-white/50 font-medium mb-2 block uppercase tracking-wider">Size</label>
                        <div className="flex bg-black/20 p-1 rounded-lg">
                            {(["s", "m", "l"] as WebcamSize[]).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => onSetWebcamSize(size)}
                                    className={cn(
                                        "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                                        webcamSize === size ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                                    )}
                                >
                                    {size.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#0E0E10]/90 backdrop-blur-xl border border-white/10 rounded-[20px] p-1.5 flex items-center gap-1.5 shadow-2xl ring-1 ring-black/50">

                <ControlButton
                    label="Screen"
                    active={screenShareEnabled}
                    onClick={onToggleScreenShare}
                    icon={Monitor}
                    offIcon={MonitorOff}
                    activeColorClass="bg-blue-500/20 text-blue-400 border-blue-500/20"
                />

                <ControlButton
                    label="Camera"
                    active={webcamEnabled}
                    onClick={() => {
                        setIsCameraSettingsOpen(!isCameraSettingsOpen);
                        if (isBackgroundOpen) setIsBackgroundOpen(false);
                    }}
                    icon={Video}
                    offIcon={VideoOff}
                    activeColorClass="bg-purple-500/20 text-purple-400 border-purple-500/20"
                />

                <ControlButton
                    label="Mic"
                    active={micEnabled}
                    onClick={onToggleMic}
                    icon={Mic}
                    offIcon={MicOff}
                    activeColorClass="bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                />

                <ControlButton
                    label="BG"
                    active={isBackgroundOpen || background.id !== "none"}
                    onClick={() => {
                        setIsBackgroundOpen(!isBackgroundOpen);
                        if (isCameraSettingsOpen) setIsCameraSettingsOpen(false);
                    }}
                    icon={Palette}
                    activeColorClass="bg-orange-500/20 text-orange-400 border-orange-500/20"
                />

                <div className="w-px h-8 bg-white/10 mx-1" />

                {status === "recording" ? (
                    <button
                        onClick={onStopRecording}
                        className="flex flex-col items-center justify-center w-20 h-14 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/20 transition-all duration-200"
                        title="Stop Recording"
                    >
                        <div className="w-6 h-6 bg-red-500 rounded-sm mb-1" />
                        <span className="text-[10px] font-medium">Stop</span>
                    </button>
                ) : (
                    <button
                        onClick={onStartRecording}
                        disabled={!canRecord}
                        className={cn(
                            "flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-all duration-200 border border-transparent",
                            canRecord
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                        )}
                        title="Start Recording"
                    >
                        <div className="w-4 h-4 bg-white rounded-full mb-1" />
                        <span className="text-[10px] font-medium">Record</span>
                    </button>
                )}

            </div>

            <button
                onClick={() => {
                    if (webcamEnabled) onToggleWebcam();
                    if (micEnabled) onToggleMic();
                    if (screenShareEnabled) onToggleScreenShare();
                    if (isBackgroundOpen) setIsBackgroundOpen(false);
                    if (isCameraSettingsOpen) setIsCameraSettingsOpen(false);
                    if (onReset) onReset();
                }}
                className="ml-4 w-12 h-12 rounded-full border border-white/10 bg-[#0E0E10]/90 backdrop-blur-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-lg"
                title="Close / Reset"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
