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
    } catch {
      setState("listening");
    }
  }, [cleanup]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  const togglePause = () => {
    if (state === "paused") {
      startSession();
    } else {
      cleanup();
      setState("paused");
    }
  };

  const displayLine =
    transcript.length > 0
      ? transcript[transcript.length - 1]
      : "“Butler, hold my morning until 9:30 and prep the deck for Kai — dry, warm.”";

  const statusLabel =
    state === "paused"
      ? "PAUSED"
      : state === "speaking"
      ? "SPEAKING · IN YOUR VOICE"
      : "LISTENING · IN YOUR VOICE";

  return (
    <div className="h-full flex flex-col bg-b-ink text-b-text-inverse overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-[6px] bg-b-accent-soft" />
          <span className="body-md-med text-b-text-inverse">Butler · Voice Room</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="mono-label text-b-text-tertiary">Zephyr voice</span>
          <span className="mono-label text-b-text-tertiary">Whisper mode</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full border border-b-border-strong mono-label text-b-text-inverse hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close ⏎
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex min-h-0">
        {/* Earlier */}
        <aside className="hidden xl:block w-56 shrink-0 px-10 pt-8">
          <p className="mono-label text-b-text-tertiary mb-4">EARLIER THIS MORNING</p>
          <div className="space-y-3">
            {EARLIER.map((e) => (
              <div key={e.time} className="flex gap-3">
                <span className="mono-sm text-b-accent-text">{e.time}</span>
                <span className="body-sm text-b-text-tertiary">{e.text}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 min-w-0">
          <div className="relative flex items-center justify-center mb-10">
            <motion.div
              className="absolute w-[360px] h-[360px] rounded-full border border-b-accent/20"
              animate={reducedMotion || state === "paused" ? undefined : { scale: [1, 1.03, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute w-[280px] h-[280px] rounded-full bg-b-accent/10"
              animate={reducedMotion || state === "paused" ? undefined : { scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.button
              type="button"
              onClick={togglePause}
              className="relative w-[120px] h-[120px] rounded-full bg-b-accent flex items-center justify-center cursor-pointer shadow-[0_0_60px_rgba(184,84,49,0.35)]"
              animate={
                reducedMotion || state !== "listening"
                  ? undefined
                  : { scale: [1, 1.04, 1] }
              }
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <span className="w-14 h-14 rounded-full bg-b-accent-soft/80" />
            </motion.button>
          </div>

          <p className="mono-label text-b-accent-text mb-3">{statusLabel}</p>
          <p
            className="text-center text-[24px] leading-[30px] max-w-2xl text-b-text-inverse mb-4"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            {displayLine}
          </p>
          <p className="body-lg text-b-text-tertiary text-center max-w-xl">
            {state === "paused"
              ? "Tap the orb to resume listening."
              : "Held. Deck drafted — I will show you when you land."}
          </p>

          {/* Waveform */}
          <div className="flex items-end justify-center gap-1.5 h-16 mt-12">
            {WAVEFORM.map((h, i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-b-accent"
                style={{ height: h, opacity: state === "listening" ? 0.5 + (i % 3) * 0.15 : 0.25 }}
                animate={
                  reducedMotion || state !== "listening"
                    ? undefined
                    : { height: [h, h + 8, h] }
                }
                transition={{ duration: 0.8 + (i % 5) * 0.1, repeat: Infinity, delay: i * 0.03 }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={togglePause}
              className="px-5 py-3.5 rounded-full border border-b-border-strong body-md-med hover:bg-white/5 transition-colors cursor-pointer"
            >
              {state === "paused" ? "Resume listening" : "Pause listening"}
            </button>
            <button
              type="button"
              className="px-5 py-3.5 rounded-full bg-b-accent text-b-text-on-accent body-md-med hover:opacity-90 transition-opacity cursor-pointer"
            >
              Send transcript
            </button>
            <Link
              href="/dashboard/chat"
              className="px-5 py-3.5 rounded-full border border-b-border-strong body-md-med hover:bg-white/5 transition-colors"
            >
              Switch to chat
            </Link>
          </div>
        </div>

        {/* Suggestions */}
        <aside className="hidden xl:block w-56 shrink-0 px-6 pt-8">
          <p className="mono-label text-b-text-tertiary mb-4">SAY TO BUTLER</p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <span
                key={s}
                className="inline-flex px-3 py-2 rounded-full border border-b-border-strong body-sm text-b-text-tertiary"
              >
                {s}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}