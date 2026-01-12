"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function SettingsPanel() {
  const [quality, setQuality] = useState("1080p-30");
  const [systemAudio, setSystemAudio] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [webcamPosition, setWebcamPosition] = useState("br");
  const [webcamSize, setWebcamSize] = useState("small");

  return (
    <Card className="p-4 space-y-4 shadow-lg animate-in fade-in slide-in-from-right-4 duration-200">
      <h2 className="font-bold text-lg">Settings</h2>

      {/* Video Quality */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Video Quality</label>
        <div className="space-y-2">
          {[
            { id: "720p-30", label: "720p @ 30fps" },
            { id: "1080p-30", label: "1080p @ 30fps" },
            { id: "1080p-60", label: "1080p @ 60fps" },
          ].map((preset) => (
            <label
              key={preset.id}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <input
                type="radio"
                name="quality"
                value={preset.id}
                checked={quality === preset.id}
                onChange={(e) => setQuality(e.target.value)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm">{preset.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Audio Settings */}
      <div className="border-t border-border pt-4 space-y-2">
        <label className="text-sm font-semibold">Audio</label>
        <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <input
            type="checkbox"
            checked={systemAudio}
            onChange={(e) => setSystemAudio(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm">System Audio</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <input
            type="checkbox"
            checked={microphone}
            onChange={(e) => setMicrophone(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm">Microphone</span>
        </label>
      </div>

      {/* Webcam Settings */}
      <div className="border-t border-border pt-4 space-y-2">
        <label className="text-sm font-semibold">
          Webcam Picture-in-Picture
        </label>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground mb-2 block">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "tl", label: "Top Left" },
              { id: "tr", label: "Top Right" },
              { id: "bl", label: "Bottom Left" },
              { id: "br", label: "Bottom Right" },
            ].map((pos) => (
              <button
                key={pos.id}
                onClick={() => setWebcamPosition(pos.id)}
                className={`text-xs py-2 rounded border transition-all hover:scale-105 active:scale-95 ${
                  webcamPosition === pos.id
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs text-muted-foreground">Size</label>
          <select
            value={webcamSize}
            onChange={(e) => setWebcamSize(e.target.value)}
            className="w-full px-2 py-1 rounded border border-border bg-background text-sm transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
