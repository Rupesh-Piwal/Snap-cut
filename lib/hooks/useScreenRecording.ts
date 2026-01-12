import { useState, useRef, useEffect } from "react";
import {
  cleanupRecording,
  createAudioMixer,
  createRecordingBlob,
  getMediaStreams,
  setupRecording,
} from "../record-utils";
import { BunnyRecordingState, ExtendedMediaStream } from "../types";

export const useScreenRecording = () => {
  const [state, setState] = useState<BunnyRecordingState>({
    isRecording: false,
    recordedBlob: null,
    recordedVideoUrl: "",
    recordingDuration: 0, // seconds
  });
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<ExtendedMediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /* --------------------------------------------
     Live duration timer (single source of truth)
  --------------------------------------------- */
  useEffect(() => {
    if (!state.isRecording || !startTimeRef.current) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTimeRef.current!) / 1000);

      setState((prev) => ({
        ...prev,
        recordingDuration: seconds,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRecording]);

  /* --------------------------------------------
     Cleanup on unmount only
  --------------------------------------------- */
  useEffect(() => {
    return () => {
      cleanupRecording(
        mediaRecorderRef.current,
        streamRef.current,
        streamRef.current?._originalStreams
      );

      if (state.recordedVideoUrl) {
        URL.revokeObjectURL(state.recordedVideoUrl);
      }

      audioContextRef.current?.close().catch(console.error);
    };
  }, []);

  /* --------------------------------------------
     MediaRecorder stop handler
  --------------------------------------------- */
  const handleRecordingStop = () => {
    const { blob, url } = createRecordingBlob(chunksRef.current);

    setState((prev) => ({
      ...prev,
      recordedBlob: blob,
      recordedVideoUrl: url,
      isRecording: false,
    }));
  };

  /* --------------------------------------------
     Start recording
  --------------------------------------------- */
  const startRecording = async (withMic = true) => {
    try {
      stopRecording();

      const { displayStream, micStream, hasDisplayAudio } =
        await getMediaStreams(withMic);

      const combinedStream = new MediaStream() as ExtendedMediaStream;

      displayStream
        .getVideoTracks()
        .forEach((track) => combinedStream.addTrack(track));

      audioContextRef.current = new AudioContext();
      const audioDestination = createAudioMixer(
        audioContextRef.current,
        displayStream,
        micStream,
        hasDisplayAudio
      );

      audioDestination?.stream
        .getAudioTracks()
        .forEach((track) => combinedStream.addTrack(track));

      combinedStream._originalStreams = [
        displayStream,
        ...(micStream ? [micStream] : []),
      ];

      streamRef.current = combinedStream;

      mediaRecorderRef.current = setupRecording(combinedStream, {
        onDataAvailable: (e: BlobEvent) => {
          if (e.data.size) chunksRef.current.push(e.data);
        },
        onStop: handleRecordingStop,
      });

      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorderRef.current.start(1000);
      setState((prev) => ({
        ...prev,
        isRecording: true,
        recordingDuration: 0,
      }));

      streamRef.current = combinedStream;
      setPreviewStream(combinedStream);

      return true;
    } catch (error) {
      console.error("Recording error:", error);
      return false;
    }
  };

  /* --------------------------------------------
     Stop recording
  --------------------------------------------- */
  const stopRecording = () => {
    cleanupRecording(
      mediaRecorderRef.current,
      streamRef.current,
      streamRef.current?._originalStreams
    );

    streamRef.current = null;

    setPreviewStream(null);

    setState((prev) => ({
      ...prev,
      isRecording: false,
    }));
  };

  /* --------------------------------------------
     Reset recording
  --------------------------------------------- */
  const resetRecording = () => {
    stopRecording();

    if (state.recordedVideoUrl) {
      URL.revokeObjectURL(state.recordedVideoUrl);
    }

    setPreviewStream(null);

    startTimeRef.current = null;
    chunksRef.current = [];

    setState({
      isRecording: false,
      recordedBlob: null,
      recordedVideoUrl: "",
      recordingDuration: 0,
    });
  };

  return {
    ...state,
    previewStream,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
