"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/lib/motion";

interface VoiceAssistantProps {
  onClose: () => void;
}

type SessionState = "idle" | "connecting" | "listening" | "speaking" | "paused";

const EARLIER = [
  { time: "06:58", text: "“Read overnight mail.”" },
  { time: "07:02", text: "“Rank by urgency.”" },
  { time: "07:03", text: "“Draft replies in my voice.”" },
];

const SUGGESTIONS = [
  "“Give me the brief.”",
  "“What is Kai waiting on?”",
  "“Move my 10am.”",
  "“Draft to Meridian.”",
  "“Hold silence until 3.”",
];

const WAVEFORM = [12, 20, 32, 44, 52, 60, 48, 40, 28, 20, 32, 44, 56, 68, 54, 42, 30, 20, 14, 20, 32, 44, 54, 44, 32, 20, 14, 20, 32, 44, 52, 44, 32, 20, 12];

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<SessionState>("listening");
  const [transcript, setTranscript] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setState("idle");
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startSession = useCallback(async () => {
    try {
      setState("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });
      mediaRef.current = stream;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const wsUrl = apiBase.replace(/^http/, "ws") + "/ws/live";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = audioCtx;

      ws.onopen = () => {
        setState("listening");
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioCtx.destination);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, pcm[i] * 32768));
          }
          ws.send(int16.buffer);
        };
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "transcript") {
              setTranscript((prev) => [...prev, msg.text]);
            }
          } catch {}
        } else {
          setState("speaking");
          const arrayBuffer =
            event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
          try {
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const bufferSource = audioCtx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(audioCtx.destination);
            bufferSource.onended = () => setState("listening");
            bufferSource.start();
          } catch {
            setState("listening");
          }
        }
      };

      ws.onclose = () => cleanup();
      ws.onerror = () => cleanup();
    } catch (err) {
      console.error("Voice session failed:", err);
      cleanup();
    }
  }, [cleanup]);

  const stopSession = useCallback(() => {
    cleanup();
    setTranscript([]);
  }, [cleanup]);

  const stateColors: Record<SessionState, string> = {
    idle: "bg-b-border-default",
    connecting: "bg-b-warning animate-pulse",
    listening: "bg-b-success animate-pulse",
    speaking: "bg-b-accent",
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-b-canvas px-6">
      <button
        onClick={state === "idle" ? startSession : stopSession}
        className={`w-32 h-32 rounded-full ${stateColors[state]} transition-all duration-300 cursor-pointer flex items-center justify-center`}
      >
        <span className="text-white heading-lg">
          {state === "idle" ? "▶" : "■"}
        </span>
      </button>

      <p className="heading-sm text-b-text-secondary mt-6 capitalize">
        {state === "idle" ? "Tap to speak" : state}
      </p>

      {transcript.length > 0 && (
        <div className="mt-6 w-full max-w-md space-y-2 max-h-48 overflow-y-auto">
          {transcript.map((t, i) => (
            <p key={i} className="body-sm text-b-text-primary bg-b-raised rounded-[10px] px-3 py-2">
              {t}
            </p>
          ))}
        </div>
      )}

      <Button variant="ghost" className="mt-8" onClick={onClose}>
        Back to Dashboard
      </Button>
    </div>
  );
}
