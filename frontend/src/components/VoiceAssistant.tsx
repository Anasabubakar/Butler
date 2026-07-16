"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/lib/motion";
import { getIdToken } from "@/lib/firebase";
import { normalizeApiBase } from "@/lib/api";
import ButlerLogo from "./ButlerLogo";

interface VoiceAssistantProps {
  onClose: () => void;
}

type SessionState = "idle" | "connecting" | "listening" | "speaking" | "paused" | "error";

const SUGGESTIONS = [
  "Give me the brief.",
  "What needs me today?",
  "Move my next meeting.",
  "Draft a reply in my voice.",
  "Hold silence until 3.",
];

const WAVEFORM = [
  12, 20, 32, 44, 52, 60, 48, 40, 28, 20, 32, 44, 56, 68, 54, 42, 30, 20, 14, 20, 32, 44, 54, 44, 32,
  20, 14, 20, 32, 44, 52, 44, 32, 20, 12,
];

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = useCallback(() => {
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    processorRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startSession = useCallback(async () => {
    cleanup();
    setError(null);
    try {
      setState("connecting");
      const idToken = await getIdToken();
      if (!idToken) {
        setError("Sign in required for voice.");
        setState("error");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });
      mediaRef.current = stream;

      const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
      const wsUrl =
        apiBase.replace(/^http/i, "ws") + `/ws/live?token=${encodeURIComponent(idToken)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = audioCtx;

      ws.onopen = () => {
        setState("listening");
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(audioCtx.destination);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, pcm[i] * 32768));
          }
          // Server expects JSON with base64 PCM when possible; raw buffer as fallback
          const bytes = new Uint8Array(int16.buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ audio: btoa(binary) }));
        };
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "transcript" && msg.text) {
              setTranscript((prev) => [...prev, msg.text]);
            } else if (msg.text) {
              setTranscript((prev) => [...prev, msg.text]);
            } else if (msg.audio) {
              setState("speaking");
              // base64 audio from live bridge
              const raw = atob(msg.audio);
              const buf = new ArrayBuffer(raw.length);
              const view = new Uint8Array(buf);
              for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
              try {
                const audioBuffer = await audioCtx.decodeAudioData(buf.slice(0));
                const bufferSource = audioCtx.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.connect(audioCtx.destination);
                bufferSource.onended = () => setState("listening");
                bufferSource.start();
              } catch {
                setState("listening");
              }
            } else if (msg.turn_complete || msg.type === "turn_complete") {
              setState("listening");
            }
          } catch {
            /* ignore parse errors */
          }
          return;
        }

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
      };

      ws.onclose = () => {
        if (state !== "paused") setState("idle");
      };
      ws.onerror = () => {
        setError("Voice connection failed.");
        setState("error");
        cleanup();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone or connection failed.");
      setState("error");
      cleanup();
    }
  }, [cleanup, state]);

  useEffect(() => {
    void startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    if (state === "paused" || state === "idle" || state === "error") {
      void startSession();
    } else {
      cleanup();
      setState("paused");
    }
  };

  const sendTranscriptToChat = () => {
    if (transcript.length === 0) return;
    const text = transcript.join(" ");
    sessionStorage.setItem("butler_voice_handoff", text);
    window.location.href = "/dashboard/chat";
  };

  const applySuggestion = (s: string) => {
    setTranscript((prev) => [...prev, s]);
  };

  const displayLine =
    transcript.length > 0
      ? transcript[transcript.length - 1]
      : state === "connecting"
      ? "Connecting to Butler…"
      : state === "error"
      ? error || "Voice unavailable."
      : "Tap the orb and speak, Boss.";

  const statusLabel =
    state === "paused"
      ? "PAUSED"
      : state === "speaking"
      ? "SPEAKING · IN YOUR VOICE"
      : state === "connecting"
      ? "CONNECTING"
      : state === "error"
      ? "ERROR"
      : state === "listening"
      ? "LISTENING · IN YOUR VOICE"
      : "READY";

  return (
    <div className="h-full flex flex-col bg-b-ink text-b-text-inverse overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ButlerLogo size={28} variant="light" />
          <span className="body-md-med text-b-text-inverse">Butler · Voice Room</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="mono-label text-b-text-tertiary">Zephyr voice</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full border border-b-border-strong mono-label text-b-text-inverse hover:bg-white/5 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex min-h-0">
        <aside className="hidden xl:block w-56 shrink-0 px-10 pt-8">
          <p className="mono-label text-b-text-tertiary mb-4">THIS SESSION</p>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {transcript.length === 0 ? (
              <p className="body-sm text-b-text-tertiary">Nothing captured yet.</p>
            ) : (
              transcript.map((line, i) => (
                <div key={`${i}-${line.slice(0, 12)}`} className="flex gap-3">
                  <span className="mono-sm text-b-accent-text">{String(i + 1).padStart(2, "0")}</span>
                  <span className="body-sm text-b-text-tertiary">“{line}”</span>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 min-w-0">
          <div className="relative flex items-center justify-center mb-10">
            <motion.div
              className="absolute w-[360px] h-[360px] rounded-full border border-b-accent/20"
              animate={
                reducedMotion || state === "paused" || state === "idle"
                  ? undefined
                  : { scale: [1, 1.03, 1], opacity: [0.4, 0.6, 0.4] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute w-[280px] h-[280px] rounded-full bg-b-accent/10"
              animate={
                reducedMotion || state === "paused"
                  ? undefined
                  : { scale: [1, 1.05, 1] }
              }
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.button
              type="button"
              onClick={togglePause}
              aria-label={state === "listening" ? "Pause listening" : "Start listening"}
              className="relative w-[120px] h-[120px] rounded-full bg-b-accent flex items-center justify-center cursor-pointer shadow-[0_0_60px_rgba(184,84,49,0.35)]"
              animate={
                reducedMotion || state !== "listening" ? undefined : { scale: [1, 1.04, 1] }
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
              : state === "error"
              ? "Check microphone permissions and try again."
              : "Butler is listening. Speak naturally."}
          </p>

          <div className="flex items-end justify-center gap-1.5 h-16 mt-12" aria-hidden>
            {WAVEFORM.map((h, i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-b-accent"
                style={{
                  height: h,
                  opacity: state === "listening" ? 0.5 + (i % 3) * 0.15 : 0.25,
                }}
                animate={
                  reducedMotion || state !== "listening"
                    ? undefined
                    : { height: [h, h + 8, h] }
                }
                transition={{
                  duration: 0.8 + (i % 5) * 0.1,
                  repeat: Infinity,
                  delay: i * 0.03,
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <button
              type="button"
              onClick={togglePause}
              className="px-5 py-3.5 rounded-full border border-b-border-strong body-md-med hover:bg-white/5 transition-colors cursor-pointer"
            >
              {state === "paused" || state === "idle" || state === "error"
                ? "Start listening"
                : "Pause listening"}
            </button>
            <button
              type="button"
              onClick={sendTranscriptToChat}
              disabled={transcript.length === 0}
              className="px-5 py-3.5 rounded-full bg-b-accent text-b-text-on-accent body-md-med hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

        <aside className="hidden xl:block w-56 shrink-0 px-6 pt-8">
          <p className="mono-label text-b-text-tertiary mb-4">SAY TO BUTLER</p>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySuggestion(s)}
                className="inline-flex px-3 py-2 rounded-full border border-b-border-strong body-sm text-b-text-tertiary text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                “{s}”
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
