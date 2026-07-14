import React, { useState, useEffect, useRef } from "react";

interface VoiceAssistantProps {
  onClose?: () => void;
}

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Tap the orb to open the line.");
  const [transcript, setTranscript] = useState("");
  const [visualizerHeight, setVisualizerHeight] = useState<number[]>(new Array(24).fill(4));

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const toggleConnection = async () => {
    if (isActive) {
      cleanup();
      setIsActive(false);
      setStatusText("Voice connection closed, Boss.");
    } else {
      try {
        setStatusText("Opening the line…");
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/live`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = async () => {
          setStatusText("Establishing audio…");

          outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;

          inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = inputAudioCtxRef.current.createMediaStreamSource(stream);

          const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
          micProcessorRef.current = processor;
          source.connect(processor);
          processor.connect(inputAudioCtxRef.current.destination);

          processor.onaudioprocess = (e) => {
            const float32Data = e.inputBuffer.getChannelData(0);
            const buffer = new ArrayBuffer(float32Data.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < float32Data.length; i++) {
              let s = Math.max(-1, Math.min(1, float32Data[i]));
              view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            let binary = "";
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = window.btoa(binary);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ audio: base64 }));
            }
          };

          setIsActive(true);
          setStatusText("Speak naturally, Boss. I'm listening.");
          setTranscript("");
          animateVisualizer();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.audio) {
              playAudioChunk(msg.audio);
            }
            if (msg.transcript) {
              setTranscript(msg.transcript);
            }
            if (msg.interrupted) {
              nextStartTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
            }
            if (msg.error) {
              setStatusText(`Error: ${msg.error}`);
              cleanup();
            }
          } catch (err) {
            console.error("Voice message parse error:", err);
          }
        };

        ws.onerror = () => {
          setStatusText("Failed to connect to voice line.");
          cleanup();
        };

        ws.onclose = () => {
          setStatusText("Voice line closed.");
          cleanup();
        };
      } catch {
        setStatusText("Mic permission required, Boss.");
        cleanup();
      }
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    const audioCtx = outputAudioCtxRef.current;
    if (!audioCtx) return;

    const binary = window.atob(base64Audio);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const view = new DataView(bytes.buffer);
    const pcmLen = bytes.buffer.byteLength / 2;
    const float32Data = new Float32Array(pcmLen);
    for (let i = 0; i < pcmLen; i++) {
      const int16 = view.getInt16(i * 2, true);
      float32Data[i] = int16 / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    let startTime = nextStartTimeRef.current;
    const now = audioCtx.currentTime;
    if (startTime < now) {
      startTime = now + 0.04;
    }

    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsActive(false);
    setVisualizerHeight(new Array(24).fill(4));
  };

  const animateVisualizer = () => {
    if (!wsRef.current) return;
    setVisualizerHeight((prev) => prev.map(() => Math.floor(Math.random() * 48) + 4));
    animFrameRef.current = requestAnimationFrame(animateVisualizer);
  };

  useEffect(() => {
    return () => { cleanup(); };
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative"
      style={{ background: "var(--color-b-ink)" }}
    >
      {/* Close button */}
      {onClose && (
        <button
          onClick={() => { cleanup(); onClose(); }}
          className="absolute top-8 right-10 mono-label"
          style={{ color: "var(--color-b-text-tertiary)" }}
        >
          Close  ×
        </button>
      )}

      {/* Top label */}
      <div className="absolute top-8 left-10">
        <div className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>Voice Room</div>
        <div className="mono-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
          Gemini Live · low-latency duplex
        </div>
      </div>

      {/* Radial orb */}
      <button
        onClick={toggleConnection}
        className="relative w-[200px] h-[200px] rounded-full flex items-center justify-center transition-all"
        style={{
          background: isActive
            ? "radial-gradient(circle, var(--color-b-accent) 0%, rgba(184,84,49,0.2) 60%, transparent 80%)"
            : "radial-gradient(circle, rgba(184,84,49,0.3) 0%, rgba(184,84,49,0.05) 60%, transparent 80%)",
          boxShadow: isActive
            ? "0 0 80px rgba(184,84,49,0.3), 0 0 160px rgba(184,84,49,0.1)"
            : "0 0 40px rgba(184,84,49,0.1)",
        }}
      >
        <div
          className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
          style={{
            background: isActive ? "var(--color-b-accent)" : "rgba(184,84,49,0.4)",
            boxShadow: isActive ? "0 0 40px rgba(184,84,49,0.5)" : "none",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-b-text-inverse)" }}>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
      </button>

      {/* Waveform visualizer */}
      <div className="flex items-center justify-center gap-[3px] mt-10 h-[60px]">
        {visualizerHeight.map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all duration-75"
            style={{
              height: `${isActive ? h : 4}px`,
              background: isActive ? "var(--color-b-accent)" : "var(--color-b-text-tertiary)",
              opacity: isActive ? 0.8 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="mt-8 text-center">
        <div className="body-md" style={{ color: "var(--color-b-text-inverse)" }}>
          {statusText}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mt-6 max-w-[520px] text-center">
          <div
            className="body-lg italic font-serif"
            style={{ color: "var(--color-b-text-tertiary)", fontFamily: "var(--font-serif)" }}
          >
            "{transcript}"
          </div>
        </div>
      )}

      {/* Quick-say chips */}
      <div className="absolute bottom-10 flex items-center gap-3">
        {QUICK_SAYS.map((q) => (
          <button
            key={q}
            className="px-4 py-2 rounded-full mono-label transition-colors"
            style={{
              background: "rgba(245,239,230,0.08)",
              color: "var(--color-b-text-tertiary)",
              border: "1px solid rgba(245,239,230,0.1)",
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const QUICK_SAYS = [
  "Read my brief",
  "What's next?",
  "Summarize inbox",
  "Hold my calls",
];
