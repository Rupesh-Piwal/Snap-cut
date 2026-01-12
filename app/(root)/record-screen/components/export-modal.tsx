"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Download, Copy } from "lucide-react";

interface ExportModalProps {
  recordingTitle: string;
  recordingDuration: number;
  onClose: () => void;
}

type Format = "mp4" | "webm" | "gif";
type QualityPreset = "high" | "medium" | "low";

export default function ExportModal({
  recordingTitle,
  recordingDuration,
  onClose,
}: ExportModalProps) {
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(recordingDuration);
  const [selectedFormat, setSelectedFormat] = useState<Format>("mp4");
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("high");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [shareLink, setShareLink] = useState("");

  const formatOptions: { id: Format; label: string; description: string }[] = [
    { id: "mp4", label: "MP4", description: "Best compatibility" },
    { id: "webm", label: "WebM", description: "Smaller file size" },
    { id: "gif", label: "GIF", description: "Animated GIF" },
  ];

  const qualityOptions: {
    id: QualityPreset;
    label: string;
    bitrate: string;
  }[] = [
    { id: "high", label: "High", bitrate: "10 Mbps" },
    { id: "medium", label: "Medium", bitrate: "5 Mbps" },
    { id: "low", label: "Low", bitrate: "2 Mbps" },
  ];

  const estimateFileSize = () => {
    const durationInSeconds = trimEnd - trimStart;
    const bitrateMap: Record<QualityPreset, number> = {
      high: 10,
      medium: 5,
      low: 2,
    };
    const bitrate = bitrateMap[qualityPreset];
    const sizeMB = (durationInSeconds * bitrate) / 8;
    return sizeMB.toFixed(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleExport = () => {
    setIsExporting(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setExportProgress(100);
          setShareLink("https://screenflow.app/share/abc123xyz");
        }, 500);
      }
      setExportProgress(progress);
    }, 300);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  if (isExporting && exportProgress < 100) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
        <Card className="w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
          <h2 className="text-2xl font-bold">Exporting...</h2>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(exportProgress)}% complete
            </p>
          </div>

          {/* Format Info */}
          <div className="bg-muted/50 rounded p-4 space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Format:</span>{" "}
              {selectedFormat.toUpperCase()}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Quality:</span>{" "}
              {qualityOptions.find((q) => q.id === qualityPreset)?.bitrate}
            </p>
            <p className="text-sm">
              <span className="font-semibold">File Size:</span> ~
              {estimateFileSize()}MB
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Using ffmpeg to encode your video...
          </p>
        </Card>
      </div>
    );
  }

  if (shareLink) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
        <Card className="w-full max-w-md p-8 space-y-6 animate-in zoom-in-95 duration-200">
          <h2 className="text-2xl font-bold">Export Complete!</h2>

          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-in bounce duration-700">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Download Button */}
          <Button className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition-all hover:scale-105">
            <Download className="w-4 h-4" />
            Download {selectedFormat.toUpperCase()}
          </Button>

          {/* Share Section */}
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-semibold">Share Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 rounded border border-border bg-muted text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="flex items-center gap-1 bg-transparent transition-all hover:scale-105"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with others to view your recording
            </p>
          </div>

          {/* Close Button */}
          <Button
            variant="outline"
            className="w-full bg-transparent transition-all hover:scale-105"
            onClick={onClose}
          >
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Export Recording</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-0 h-auto transition-all hover:scale-125"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Recording Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Recording</label>
            <p className="text-foreground">{recordingTitle}</p>
          </div>

          {/* Trim Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="text-sm font-semibold">Trim Video</label>

            {/* Timeline Visualization */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(trimStart)}</span>
                <span>{formatTime(trimEnd)}</span>
              </div>

              {/* Timeline Bar with Trim Handles */}
              <div className="relative h-12 bg-muted rounded-lg overflow-hidden group">
                {/* Timeline Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20" />

                {/* Selected Range */}
                <div
                  className="absolute h-full bg-blue-500/40 border-l-2 border-r-2 border-blue-500 group-hover:bg-blue-500/50 transition-colors"
                  style={{
                    left: `${(trimStart / recordingDuration) * 100}%`,
                    right: `${100 - (trimEnd / recordingDuration) * 100}%`,
                  }}
                />

                {/* Start Handle */}
                <div
                  className="absolute top-1/2 w-4 h-8 bg-blue-600 rounded-sm transform -translate-y-1/2 -translate-x-1/2 cursor-col-resize hover:bg-blue-700 transition-colors shadow"
                  style={{ left: `${(trimStart / recordingDuration) * 100}%` }}
                  draggable
                  onDrag={(e) => {
                    if (e.clientX > 0) {
                      const newStart = Math.max(
                        0,
                        (e.clientX /
                          e.currentTarget.parentElement!.offsetWidth) *
                          recordingDuration
                      );
                      if (newStart < trimEnd) setTrimStart(newStart);
                    }
                  }}
                />

                {/* End Handle */}
                <div
                  className="absolute top-1/2 w-4 h-8 bg-blue-600 rounded-sm transform -translate-y-1/2 translate-x-1/2 cursor-col-resize hover:bg-blue-700 transition-colors shadow"
                  style={{
                    right: `${100 - (trimEnd / recordingDuration) * 100}%`,
                  }}
                  draggable
                  onDrag={(e) => {
                    if (e.clientX > 0) {
                      const newEnd = Math.min(
                        recordingDuration,
                        (e.clientX /
                          e.currentTarget.parentElement!.offsetWidth) *
                          recordingDuration
                      );
                      if (newEnd > trimStart) setTrimEnd(newEnd);
                    }
                  }}
                />
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start</label>
                  <input
                    type="text"
                    value={formatTime(trimStart)}
                    readOnly
                    className="w-full px-2 py-1 rounded border border-border bg-muted text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End</label>
                  <input
                    type="text"
                    value={formatTime(trimEnd)}
                    readOnly
                    className="w-full px-2 py-1 rounded border border-border bg-muted text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="text-sm font-semibold">Format</label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 text-left ${
                    selectedFormat === format.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <p className="font-semibold text-sm">{format.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Selection */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="text-sm font-semibold">Quality</label>
            <div className="grid grid-cols-3 gap-3">
              {qualityOptions.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setQualityPreset(preset.id)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 text-left ${
                    qualityPreset === preset.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <p className="font-semibold text-sm">{preset.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {preset.bitrate}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* File Size Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Duration:</span>
              <span className="font-mono text-sm font-semibold">
                {formatTime(trimEnd - trimStart)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Estimated File Size:</span>
              <span className="font-mono text-sm font-semibold">
                ~{estimateFileSize()} MB
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              className="flex-1 bg-transparent transition-all hover:scale-105"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white transition-all hover:scale-105"
            >
              <Download className="w-4 h-4 mr-2" />
              Export as {selectedFormat.toUpperCase()}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
