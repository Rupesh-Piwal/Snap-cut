export type MediaStreams = {
  displayStream: MediaStream;
  micStream: MediaStream | null;
  hasDisplayAudio: boolean;
};

export type RecordingHandlers = {
  onDataAvailable: (event: BlobEvent) => void;
  onStop: () => void;
};

export type BunnyRecordingState = {
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedVideoUrl: string;
  recordingDuration: number;
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
