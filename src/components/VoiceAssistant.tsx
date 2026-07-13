import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Sparkles, RefreshCw, AlertCircle, Play, Square } from "lucide-react";

export default function VoiceAssistant() {
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Tap to initiate secure voice pipeline with Butler...");
  const [visualizerHeight, setVisualizerHeight] = useState<number[]>(new Array(16).fill(4));

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Toggle voice line connection
  const toggleConnection = async () => {
    if (isActive) {
      cleanup();
      setIsActive(false);
      setStatusText("Voice connection terminated, Boss.");
    } else {
      try {
        setStatusText("Opening communication tunnel...");
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/live`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = async () => {
          setStatusText("Establishing audio contexts...");
          
          // Output audio context (24kHz for model output)
          outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;

          // Input audio context (16kHz for mic)
          inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

          // Stream mic
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
          
          // ScriptProcessor for raw PCM capture
          const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
          micProcessorRef.current = processor;
          source.connect(processor);
          processor.connect(inputAudioCtxRef.current.destination);

          processor.onaudioprocess = (e) => {
            const float32Data = e.inputBuffer.getChannelData(0);
            
            // Convert to 16-bit Int PCM little endian
            const buffer = new ArrayBuffer(float32Data.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < float32Data.length; i++) {
              let s = Math.max(-1, Math.min(1, float32Data[i]));
              view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }

            // Convert to base64
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
          setStatusText("Secure line active. Speak naturally, Boss...");
          animateVisualizer();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.audio) {
              playAudioChunk(msg.audio);
            }
            if (msg.interrupted) {
              // User spoke over Butler. Clear playback schedule
              nextStartTimeRef.current = outputAudioCtxRef.current?.currentTime || 0;
            }
            if (msg.error) {
              setStatusText(`Line error: ${msg.error}`);
              cleanup();
            }
          } catch (err) {
            console.error("Audio block read error:", err);
          }
        };

        ws.onerror = (err) => {
          console.error("WS error:", err);
          setStatusText("Failed to bridge voice connection.");
          cleanup();
        };

        ws.onclose = () => {
          setStatusText("Voice connection closed.");
          cleanup();
        };

      } catch (err: any) {
        console.error("Mic/WS pipeline error:", err);
        setStatusText("Mic permissions or WS pipeline blocked.");
        cleanup();
      }
    }
  };

  // Playback raw model audio
  const playAudioChunk = (base64Audio: string) => {
    const audioCtx = outputAudioCtxRef.current;
    if (!audioCtx) return;

    // Base64 to ArrayBuffer
    const binary = window.atob(base64Audio);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert Int16 little-endian PCM bytes back to Float32 for playback
    const view = new DataView(bytes.buffer);
    const pcmLen = bytes.buffer.byteLength / 2;
    const float32Data = new Float32Array(pcmLen);
    for (let i = 0; i < pcmLen; i++) {
      const int16 = view.getInt16(i * 2, true);
      float32Data[i] = int16 / 32768;
    }

    // Schedule into AudioContext
    const audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    let startTime = nextStartTimeRef.current;
    const now = audioCtx.currentTime;
    if (startTime < now) {
      startTime = now + 0.04; // small offset buffer to prevent clicking
    }

    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  // Clean contexts and ws
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
    setVisualizerHeight(new Array(16).fill(4));
  };

  // Idle animation for voice visualizer
  const animateVisualizer = () => {
    if (!wsRef.current) return;
    setVisualizerHeight(prev => prev.map(() => Math.floor(Math.random() * 40) + 4));
    animFrameRef.current = requestAnimationFrame(animateVisualizer);
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div id="voice-assistant" className="p-8 max-w-2xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text flex flex-col justify-center items-center font-sans">
      
      {/* Visual Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-elegant-gold/20 to-elegant-gold/5 border border-elegant-gold/30 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.15)] animate-pulse">
          <Volume2 className="w-6 h-6 text-elegant-gold" />
        </div>
        <h2 className="text-2xl font-light text-white tracking-wide italic">Butler Live Voice Line</h2>
        <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Low-latency Gemini Live audio-stream bridge</p>
      </div>

      {/* Voice Visualizer */}
      <div className="flex justify-center items-center gap-1.5 bg-elegant-card border border-elegant-border rounded-xl p-8 w-full max-w-sm h-36 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        {visualizerHeight.map((h, i) => (
          <div 
            key={i} 
            style={{ height: `${isActive ? h : 4}px` }} 
            className="w-1.5 bg-gradient-to-t from-elegant-gold to-elegant-gold/40 rounded-full transition-all duration-75"
          ></div>
        ))}
      </div>

      {/* Connection Console */}
      <div className="text-center space-y-5 max-w-sm w-full">
        <p className="text-xs font-sans text-elegant-text min-h-[40px] leading-relaxed">
          {statusText}
        </p>

        {/* Action Button */}
        {isActive ? (
          <button
            onClick={toggleConnection}
            className="flex items-center gap-2.5 mx-auto px-6 py-3 border border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/15 rounded-lg text-xs font-mono uppercase tracking-widest transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            Disconnect Line
          </button>
        ) : (
          <button
            onClick={toggleConnection}
            className="flex items-center gap-2.5 mx-auto px-6 py-3 border border-elegant-gold/30 text-elegant-gold bg-elegant-gold/5 hover:bg-elegant-gold/15 hover:text-white font-mono text-[10px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            Connect Live Voice
          </button>
        )}
      </div>

      {/* Notes / Instructions */}
      <div className="bg-elegant-card border border-elegant-border rounded-xl p-5 max-w-sm text-[11px] text-elegant-muted leading-relaxed text-left space-y-3 shadow-md">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-elegant-gold shrink-0 mt-0.5" />
          <p>
            This connection enables a direct duplex channel to Gemini Pro Live. You can speak to Butler in real-time, ask about your calendar, or dictate notes simply with your voice.
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <Volume2 className="w-4 h-4 text-elegant-dark shrink-0 mt-0.5" />
          <p>
            Butler will interrupt himself if you start speaking while he is responding, preserving natural conversation flows.
          </p>
        </div>
      </div>

    </div>
  );
}
