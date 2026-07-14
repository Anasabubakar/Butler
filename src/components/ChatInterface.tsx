import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { Message, ChatMode } from "../types";
import ButlerLogo from "./ButlerLogo";
import Chip from "./Chip";
import Button from "./Button";

const MODES: Array<{ key: ChatMode; label: string }> = [
  { key: "general",     label: "Compose"  },
  { key: "thinking",    label: "Thinking" },
  { key: "search",      label: "Web"      },
  { key: "maps",        label: "Maps"     },
  { key: "low-latency", label: "Instant"  },
];

interface ChatInterfaceProps {
  onOpenVoice?: () => void;
}

/**
 * Chat Interface — implements the Figma "07 · AI Chat" frame.
 * Panels: conversation list (280) + main thread + composer with mode selector.
 * Backend endpoints (/api/butler/chat, /transcribe, /analyze) are preserved verbatim.
 */
export default function ChatInterface({ onOpenVoice }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("butler_chat_history");
    if (saved) try { return JSON.parse(saved); } catch { /* fall through */ }
    return [
      {
        id: "welcome",
        role: "model",
        text: "Good morning, Boss. I've read your overnight mail, ranked it, and drafted the first three replies in your voice. When you're ready, ask — I'll show you what changed.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      } as Message,
    ];
  });

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const [isGenerating, setIsGenerating] = useState(false);

  const [attachedFile, setAttachedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("butler_chat_history", JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ==== Backend send ====
  const send = async () => {
    if (!input.trim() && !attachedFile) return;
    const userText = input.trim();
    const file = attachedFile;
    setInput("");
    setAttachedFile(null);

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      text: file ? `[Attached: ${file.name}] ${userText || "Look at this for me, Butler."}` : userText,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const placeholderId = "placeholder-" + Math.random();
    setMessages((prev) => [...prev, userMsg, { id: placeholderId, role: "model", text: "", timestamp: "", isThinking: true } as Message]);
    setIsGenerating(true);

    try {
      let responseText = "";
      let groundingSources: any[] = [];

      let userLocation: any = null;
      if (mode === "maps") {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          userLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {
          userLocation = null; // Server decides fallback; global by design
        }
      }

      if (file) {
        const r = await fetch("/api/butler/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: file.base64, mimeType: file.mimeType, prompt: userText || "What is shown here, Boss?" }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        responseText = data.analysis;
      } else {
        const history = messages
          .filter((m) => m.id !== "welcome" && !m.isThinking)
          .concat(userMsg)
          .map((m) => ({ role: m.role, text: m.text }));

        const r = await fetch("/api/butler/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, mode, userLocation }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        responseText = data.text;
        groundingSources = data.groundingSources || [];
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                id: Math.random().toString(),
                role: "model",
                text: responseText,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                groundingSources,
              } as Message
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? ({
                id: Math.random().toString(),
                role: "model",
                text: `Apologies, Boss — I hit a snag: ${err?.message || "unknown error"}. Please check the server keys.`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              } as Message)
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ==== Voice dictation (unchanged behaviour) ====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const b64 = (reader.result as string).split(",")[1];
            const r = await fetch("/api/butler/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioBase64: b64, mimeType: "audio/webm" }),
            });
            const data = await r.json();
            if (data.transcription) setInput((p) => (p ? p + " " + data.transcription : data.transcription));
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setIsRecording(true);
    } catch {
      alert("Boss, I couldn't reach the microphone. Please grant permission.");
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setAttachedFile({ base64: b64, mimeType: f.type, name: f.name });
    };
    reader.readAsDataURL(f);
  };

  const activeThread = { title: "Today's conversation", meta: "with Butler  ·  connected to your Workspace" };

  return (
    <div className="w-full h-full flex" style={{ background: "var(--color-b-canvas)" }}>
      {/* ==== CONVERSATION LIST ==== */}
      <div
        className="w-[280px] flex-shrink-0 flex flex-col border-r"
        style={{ background: "var(--color-b-sunken)", borderColor: "var(--color-b-border-subtle)" }}
      >
        <div className="px-6 pt-8 pb-4">
          <h2 className="h-3" style={{ color: "var(--color-b-text-primary)" }}>Conversations</h2>
          <div className="mono-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
            {Math.max(1, Math.ceil(messages.length / 4))} active  ·  with Butler
          </div>
        </div>
        <div className="px-6 pb-4">
          <Button
            variant="primary"
            full
            size="sm"
            onClick={() => {
              const ok = window.confirm("Start a new thread, Boss? The current one will archive locally.");
              if (!ok) return;
              setMessages([
                {
                  id: "welcome-new",
                  role: "model",
                  text: "Fresh page, Boss. What would you like me to move first?",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                } as Message,
              ]);
            }}
          >
            +  Begin a new thread
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-2">
          {THREAD_LIST.map((t, i) => (
            <button
              key={t.title}
              className="rounded-[10px] px-4 py-3 text-left transition-colors"
              style={{
                background: i === 0 ? "var(--color-b-paper)" : "transparent",
                border: `1px solid ${i === 0 ? "var(--color-b-border-subtle)" : "transparent"}`,
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="body-md-med truncate" style={{ color: "var(--color-b-text-primary)" }}>{t.title}</div>
                <div className="mono-sm flex-shrink-0" style={{ color: "var(--color-b-text-tertiary)" }}>{t.when}</div>
              </div>
              <div className="body-sm truncate mt-0.5" style={{ color: "var(--color-b-text-tertiary)" }}>{t.subtitle}</div>
              <div className="mt-2"><Chip tone={t.tone as any}>{t.tag}</Chip></div>
            </button>
          ))}
        </div>
      </div>

      {/* ==== MAIN THREAD ==== */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="h-[72px] flex items-center justify-between px-10 border-b flex-shrink-0"
          style={{ background: "var(--color-b-canvas)", borderColor: "var(--color-b-border-subtle)" }}
        >
          <div>
            <div className="h-4" style={{ color: "var(--color-b-text-primary)" }}>{activeThread.title}</div>
            <div className="mono-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>{activeThread.meta}</div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "var(--color-b-paper)", border: "1px solid var(--color-b-border-subtle)" }}
          >
            <span className="mono-label" style={{ color: "var(--color-b-accent)" }}>●</span>
            <span className="mono-label" style={{ color: "var(--color-b-text-secondary)" }}>
              {modelLabel(mode)}
            </span>
          </div>
        </div>

        {/* Scroll body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8">
          <div className="max-w-[820px] mx-auto flex flex-col gap-10">
            {messages.map((m) => (m.role === "model" ? <ButlerBubble key={m.id} m={m} /> : <UserBubble key={m.id} m={m} />))}
          </div>
        </div>

        {/* Composer */}
        <div className="px-10 pb-8 flex-shrink-0">
          <div
            className="max-w-[820px] mx-auto rounded-[20px] p-5"
            style={{
              background: "var(--color-b-paper)",
              border: "1px solid var(--color-b-border-default)",
              boxShadow: "0 8px 24px rgba(28,24,21,0.06)",
            }}
          >
            {/* mode selector */}
            <div
              className="inline-flex items-center gap-1 p-1.5 rounded-full mb-4"
              style={{ background: "var(--color-b-sunken)" }}
            >
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: m.key === mode ? "var(--color-b-paper)" : "transparent",
                    border: m.key === mode ? "1px solid var(--color-b-border-subtle)" : "1px solid transparent",
                    color: m.key === mode ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)",
                  }}
                >
                  <span className="mono-label">{m.label}</span>
                </button>
              ))}
            </div>

            {attachedFile && (
              <div
                className="mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-[8px]"
                style={{ background: "var(--color-b-accent-soft)", color: "var(--color-b-accent-text)" }}
              >
                <div className="body-sm-med truncate">📎  {attachedFile.name}</div>
                <button onClick={() => setAttachedFile(null)} className="mono-label">remove</button>
              </div>
            )}

            <textarea
              ref={textAreaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Butler — or paste, drag, dictate."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={3}
              className="w-full bg-transparent outline-none body-lg resize-none"
              style={{ color: "var(--color-b-text-primary)" }}
            />

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer body-sm-med" style={{ color: "var(--color-b-text-tertiary)" }}>
                  <input ref={fileInputRef} type="file" onChange={onFile} className="hidden" accept="image/*,video/*,audio/*,application/pdf" />
                  📎 Attach
                </label>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="body-sm-med"
                  style={{ color: isRecording ? "var(--color-b-danger)" : "var(--color-b-text-tertiary)" }}
                >
                  {isTranscribing ? "◐ Transcribing…" : isRecording ? "◉ Recording — click to stop" : "🎤 Dictate"}
                </button>
                {onOpenVoice && (
                  <button onClick={onOpenVoice} className="body-sm-med" style={{ color: "var(--color-b-text-tertiary)" }}>
                    🎙️ Voice room
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="mono-label hidden sm:inline" style={{ color: "var(--color-b-text-tertiary)" }}>⌘ + ↵</span>
                <Button variant="primary" size="md" onClick={send} disabled={isGenerating}>
                  {isGenerating ? "Sending…" : "Send"}
                  <span aria-hidden="true">→</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==== bubbles ====
function ButlerBubble({ m }: { m: Message }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 mt-1"><ButlerLogo size={32} variant="dark" /></div>
      <div className="flex-1 min-w-0">
        <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>
          Butler  ·  {m.timestamp || "just now"}  ·  in your voice
        </div>
        {m.isThinking ? (
          <div className="flex gap-1.5 mt-2" aria-live="polite">
            <span className="w-2 h-2 rounded-full animate-gentle-pulse" style={{ background: "var(--color-b-accent)" }} />
            <span className="w-2 h-2 rounded-full animate-gentle-pulse" style={{ background: "var(--color-b-accent)", animationDelay: "0.15s" }} />
            <span className="w-2 h-2 rounded-full animate-gentle-pulse" style={{ background: "var(--color-b-accent)", animationDelay: "0.3s" }} />
          </div>
        ) : (
          <>
            <div className="body-md prose-butler" style={{ color: "var(--color-b-text-primary)" }}>
              <Markdown>{m.text}</Markdown>
            </div>
            {m.groundingSources && m.groundingSources.length > 0 && (
              <div
                className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-[6px] px-3 py-2"
                style={{ background: "var(--color-b-info-soft)", color: "var(--color-b-info)" }}
              >
                <span className="mono-label">Sources</span>
                {m.groundingSources.map((s, i) => (
                  <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="body-sm underline underline-offset-2">
                    {s.title}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserBubble({ m }: { m: Message }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[620px] rounded-[14px] px-5 py-3"
        style={{ background: "var(--color-b-accent-soft)", color: "var(--color-b-text-primary)" }}
      >
        <div className="mono-label mb-1" style={{ color: "var(--color-b-accent-text)" }}>Boss  ·  {m.timestamp}</div>
        <div className="body-md whitespace-pre-wrap">{m.text}</div>
      </div>
    </div>
  );
}

function modelLabel(m: ChatMode) {
  switch (m) {
    case "thinking":    return "Claude · Thinking mode";
    case "search":      return "Gemini · Web grounded";
    case "maps":        return "Gemini · Maps grounded";
    case "low-latency": return "Gemini · Instant";
    default:            return "Butler · standard";
  }
}

// ==== side panel demo threads ====
const THREAD_LIST = [
  { title: "Today's conversation",  subtitle: "with Butler — active",         when: "now", tag: "live",  tone: "accent" },
  { title: "Series-B deck edits",   subtitle: "with Kai · draft ready",       when: "2h",  tag: "draft", tone: "accent" },
  { title: "Meridian reschedule",   subtitle: "moved to 10:45",               when: "1d",  tag: "done",  tone: "success" },
  { title: "Board pack, week 28",   subtitle: "62% ready",                    when: "3d",  tag: "note",  tone: "neutral" },
  { title: "Notion: Q3 rituals",    subtitle: "outline drafted",              when: "5d",  tag: "draft", tone: "accent" },
  { title: "Location: NYC route",   subtitle: "Wed 22 July · JFK → hotel",    when: "1w",  tag: "held",  tone: "warning" },
];
