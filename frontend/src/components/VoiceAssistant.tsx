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

/** Play raw PCM s16le base64 (Gemini Live output, typically 24kHz). */
function playPcmBase64(
  audioCtx: AudioContext,
  b64: string,
  sampleRate = 24000
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      // Ensure even length
      const evenLen = bytes.length - (bytes.length % 2);
      const samples = evenLen / 2;
      const float32 = new Float32Array(samples);
      const view = new DataView(bytes.buffer, bytes.byteOffset, evenLen);
      for (let i = 0; i < samples; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }
      const buffer = audioCtx.createBuffer(1, samples, sampleRate);
      buffer.copyToChannel(float32, 0);
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtx.destination);
      src.onended = () => resolve();
      src.start();
    } catch (e) {
      reject(e);
    }
  });
}

/** Downsample Float32 mic buffer to 16kHz Int16 PCM. */
function downsampleTo16k(input: Float32Array, inputRate: number): Int16Array {
  if (inputRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
    }
    return out;
  }
  const ratio = inputRate / 16000;
  const newLen = Math.floor(input.length / ratio);
  const out = new Int16Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = Math.floor(i * ratio);
    out[i] = Math.max(-32768, Math.min(32767, input[idx] * 32768));
  }
  return out;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playQueueRef = useRef<Promise<void>>(Promise.resolve());
  const stateRef = useRef(state);
  stateRef.current = state;

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
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaRef.current = stream;

      const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);
      const wsUrl =
        apiBase.replace(/^http/i, "ws") + `/ws/live?token=${encodeURIComponent(idToken)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      // Playback context at 24kHz (Gemini Live native audio out)
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Capture context matches mic native rate; we resample to 16k
      const captureCtx = new AudioContext();
      const inputRate = captureCtx.sampleRate;

      ws.onopen = () => {
        setState("listening");
        const source = captureCtx.createMediaStreamSource(stream);
        const processor = captureCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        // Silent gain so we don't feedback mic to speakers
        const mute = captureCtx.createGain();
        mute.gain.value = 0;
        processor.connect(mute);
        mute.connect(captureCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (stateRef.current === "paused") return;
          const pcm = e.inputBuffer.getChannelData(0);
          const int16 = downsampleTo16k(pcm, inputRate);
          try {
            ws.send(JSON.stringify({ audio: int16ToBase64(int16) }));
          } catch {
            /* ignore send errors mid-stream */
          }
        };
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ready") {
            setState("listening");
            return;
          }
          if (msg.type === "error" || msg.error) {
            setError(typeof msg.error === "string" ? msg.error : "Voice server error");
            setState("error");
            return;
          }
          if (msg.type === "transcript" && msg.text) {
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              // Merge streaming partials when possible
              if (last && msg.text.startsWith(last.slice(0, Math.min(12, last.length)))) {
                return [...prev.slice(0, -1), msg.text];
              }
              return [...prev, msg.text];
            });
          } else if (msg.text && !msg.audio) {
            setTranscript((prev) => [...prev, msg.text]);
          }
          if (msg.audio) {
            setState("speaking");
            playQueueRef.current = playQueueRef.current
              .then(() => playPcmBase64(audioCtx, msg.audio, 24000))
              .then(() => {
                if (stateRef.current === "speaking") setState("listening");
              })
              .catch(() => {
                if (stateRef.current === "speaking") setState("listening");
              });
          }
          if (msg.turn_complete || msg.type === "turn_complete" || msg.TurnComplete) {
            void playQueueRef.current.then(() => setState("listening"));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onclose = () => {
        try {
          void captureCtx.close();
        } catch {
          /* ignore */
        }
        if (stateRef.current !== "paused" && stateRef.current !== "error") {
          setState("idle");
        }
      };
      ws.onerror = () => {
        setError("Voice connection failed. Check API URL and microphone.");
        setState("error");
        cleanup();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone or connection failed.");
      setState("error");
      cleanup();
    }
  }, [cleanup]);

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
                reducedMotion || state === "paused" ? undefined : { scale: [1, 1.05, 1] }
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
              ? error || "Check microphone permissions and try again."
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
