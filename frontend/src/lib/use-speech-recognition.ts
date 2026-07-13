"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "@/lib/api";

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const onFinalRef = useRef<((text: string) => void) | null>(null);

  const usingFallbackRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      const hasMediaRecorder =
        typeof window !== "undefined" &&
        typeof window.MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia;
      usingFallbackRef.current = hasMediaRecorder;
      setSupported(hasMediaRecorder);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) finalTranscriptRef.current += final;
      setInterimTranscript((finalTranscriptRef.current + interim).trim());
    };

    recognition.onend = () => {
      setListening(false);
      const finalText = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      setInterimTranscript("");
      if (finalText && onFinalRef.current) onFinalRef.current(finalText);
    };

    recognition.onerror = () => {
      setListening(false);
      finalTranscriptRef.current = "";
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
      }
    };
  }, []);

  const startFallbackRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        if (!blob.size) return;
        setInterimTranscript("Transcribing\u2026");
        try {
          const text = await transcribeAudio(blob);
          setInterimTranscript("");
          if (text.trim() && onFinalRef.current) onFinalRef.current(text.trim());
        } catch {
          setInterimTranscript("");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      onFinalRef.current = onFinal;

      if (usingFallbackRef.current) {
        void startFallbackRecording();
        return;
      }

      if (!recognitionRef.current) return;
      finalTranscriptRef.current = "";
      setInterimTranscript("");
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
      }
    },
    [startFallbackRecording],
  );

  const stop = useCallback(() => {
    if (usingFallbackRef.current) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
    }
  }, []);

  return { supported, listening, interimTranscript, start, stop };
}
