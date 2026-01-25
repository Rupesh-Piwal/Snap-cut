import React from "react";

interface LoadingViewProps {
    status: "initializing" | "stopping";
}

export function LoadingView({ status }: LoadingViewProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full border border-white/10">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">
                        {status === "initializing" ? "Starting..." : "Finalizing..."}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                        {status === "initializing" ? "Setting up..." : "Processing video..."}
                    </p>
                </div>
            </div>
        </div>
    );
}
