"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Star,
  Download,
  Trash2,
  Play,
  Grid3x3,
  List,
} from "lucide-react";
import ExportModal from "./export-modal";


interface Recording {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  thumbnail: string;
  isFavorite: boolean;
  tags: string[];
}

export default function RecordingLibrary() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "favorites" | "recent">(
    "all"
  );
  const [exportingRecording, setExportingRecording] = useState<string | null>(
    null
  );
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: "1",
      title: "Product Demo",
      duration: "5:32",
      createdAt: "2 hours ago",
      thumbnail: "/product-demo-recording.jpg",
      isFavorite: true,
      tags: ["demo", "product"],
    },
    {
      id: "2",
      title: "Team Meeting",
      duration: "23:15",
      createdAt: "1 day ago",
      thumbnail: "/team-meeting-recording.jpg",
      isFavorite: false,
      tags: ["meeting", "team"],
    },
    {
      id: "3",
      title: "Tutorial - Advanced Features",
      duration: "12:45",
      createdAt: "3 days ago",
      thumbnail: "/tutorial-advanced-features.jpg",
      isFavorite: true,
      tags: ["tutorial", "features"],
    },
  ]);

  const toggleFavorite = (id: string) => {
    setRecordings(
      recordings.map((rec) =>
        rec.id === id ? { ...rec, isFavorite: !rec.isFavorite } : rec
      )
    );
  };

  const deleteRecording = (id: string) => {
    setRecordings(recordings.filter((rec) => rec.id !== id));
  };

  const filteredRecordings = recordings
    .filter((rec) => {
      if (filterMode === "favorites") return rec.isFavorite;
      return true;
    })
    .filter((rec) =>
      rec.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <main className="flex-1 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Search and Filters */}
        <div className="space-y-4 animate-in fade-in duration-300">
          <h2 className="text-3xl font-bold">Your Recordings</h2>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 transition-shadow focus:shadow-md"
            />
          </div>

          {/* Filter and View Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              {(["all", "favorites", "recent"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={filterMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterMode(mode)}
                  className="transition-all hover:scale-105"
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="transition-all hover:scale-105"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="transition-all hover:scale-105"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredRecordings.length === 0 && (
          <Card className="p-12 text-center animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-lg mx-auto flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No recordings found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : "Go to the Record tab to start recording"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Recordings Grid */}
        {viewMode === "grid" && filteredRecordings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            {filteredRecordings.map((recording, idx) => (
              <Card
                key={recording.id}
                className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Thumbnail */}
                <div className="relative bg-black aspect-video overflow-hidden">
                  <img
                    src={recording.thumbnail || "/placeholder.svg"}
                    alt={recording.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                  />
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 transition-all hover:scale-105"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="transition-all hover:scale-105 bg-transparent"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs font-mono">
                    {recording.duration}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-2 flex-1">
                      {recording.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(recording.id)}
                      className="p-0 h-auto transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-4 h-4 transition-all ${
                          recording.isFavorite
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {recording.createdAt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {recording.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent transition-all hover:scale-105"
                      onClick={() => setExportingRecording(recording.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRecording(recording.id)}
                      className="text-destructive hover:text-destructive transition-all hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recordings List */}
        {viewMode === "list" && filteredRecordings.length > 0 && (
          <div className="space-y-2 animate-in fade-in duration-300">
            {filteredRecordings.map((recording) => (
              <Card
                key={recording.id}
                className="p-4 hover:bg-muted/50 transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <img
                    src={recording.thumbnail || "/placeholder.svg"}
                    alt={recording.title}
                    className="w-24 h-16 rounded object-cover transition-transform hover:scale-105"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {recording.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {recording.createdAt}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {recording.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="text-sm font-mono text-muted-foreground">
                    {recording.duration}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(recording.id)}
                      className="transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          recording.isFavorite
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="transition-all hover:scale-105 bg-transparent"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRecording(recording.id)}
                      className="transition-all hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Export Modal */}
        {exportingRecording && (
          <ExportModal
            recordingTitle={
              recordings.find((r) => r.id === exportingRecording)?.title ||
              "Recording"
            }
            recordingDuration={
              Number.parseInt(
                recordings
                  .find((r) => r.id === exportingRecording)
                  ?.duration.split(":")[0] || "5"
              ) * 60
            }
            onClose={() => setExportingRecording(null)}
          />
        )}
      </div>
    </main>
  );
}
