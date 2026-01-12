"use client";

import { Button } from "@/components/ui/button";
import { Sun, Moon, Video, Grid3x3 } from "lucide-react";

interface NavigationProps {
  currentView: "record" | "library";
  onViewChange: (view: "record" | "library") => void;
  isDark: boolean;
  onThemeToggle: (isDark: boolean) => void;
}

export default function Navigation({
  currentView,
  onViewChange,
  isDark,
  onThemeToggle,
}: NavigationProps) {
  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-105">
            <Video className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ScreenFlow</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "record" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange("record")}
            className="flex items-center gap-2 transition-all hover:scale-105"
          >
            <Video className="w-4 h-4" />
            Record
          </Button>
          <Button
            variant={currentView === "library" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange("library")}
            className="flex items-center gap-2 transition-all hover:scale-105"
          >
            <Grid3x3 className="w-4 h-4" />
            Library
          </Button>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-[#FAFAFA] rounded-lg p-1 text-xs text-muted-foreground animate-in fade-in duration-300 border border-[#EEEEEE]">
          {/* <p className="font-semibold mb-2">Keyboard Shortcuts:</p> */}
          <div className="bg-[#FFFFFF] grid grid-cols-2 gap-2 p-1 border border-[#EEEEEE] rounded-lg">
            <div>Ctrl + R: Start recording</div>
            <div>Ctrl + S: Stop recording</div>
            {/* <div>Ctrl + W: Toggle webcam</div> */}
          </div>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onThemeToggle(!isDark)}
          aria-label="Toggle theme"
          className="transition-all hover:scale-105"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </nav>
  );
}
