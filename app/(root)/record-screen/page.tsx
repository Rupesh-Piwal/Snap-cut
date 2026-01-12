"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import RecordingInterface from "./components/recording-interface";
import RecordingLibrary from "./components/recording-library";
type View = "record" | "library";

const Page = () => {
  const [currentView, setCurrentView] = useState<View>("record");
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true)
    // Check system preference on mount
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(prefersDark)
  }, [])

  if (!mounted) return null
  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          isDark={isDark}
          onThemeToggle={setIsDark}
        />

        {currentView === "record" ? (
          <RecordingInterface />
        ) : (
          <RecordingLibrary />
        )}
      </div>
    </div>
    // <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50">
    //   <div className="text-center mb-8 px-4">
    //     <h1 className="text-4xl font-bold text-gray-900 mb-3">
    //       Screen Recording
    //     </h1>
    //     <p className="text-lg text-gray-600 max-w-2xl mx-auto">
    //       Capture and review your screen recordings with ease
    //     </p>
    //   </div>
    //   <RecordScreen />
    // </div>
  );
};

export default Page;
