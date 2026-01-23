export type MediaStreams = {
  displayStream: MediaStream;
  micStream: MediaStream | null;
  hasDisplayAudio: boolean;
};

export type RecordingHandlers = {
  onDataAvailable: (event: BlobEvent) => void;
  onStop: () => void;
};

// Strict State Machine Definition
export type RecordingState =
  | "idle"
  | "initializing"
  | "recording"
  | "stopping"
  | "completed"
  | "error";

export type BunnyRecordingState = {
  status: RecordingState;
  isRecording: boolean; // Derived helper
  recordedBlob: Blob | null;
  recordedVideoUrl: string;
  recordingDuration: number;
  error: Error | null;
};

export type ExtendedMediaStream = MediaStream & {
  _originalStreams?: MediaStream[];
};

export type RecordingSession = {
  meta: {
    startedAt: number;
    duration: number;
    viewport: {
      width: number;
      height: number;
    };
  };
  video: Blob;
};
