"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Message, ChatMode } from "@/types";
import ButlerLogo from "./ButlerLogo";
import { fadeUp, usePrefersReducedMotion } from "@/lib/motion";

const MODES: { key: ChatMode; label: string }[] = [
  { key: "general", label: "General" },
  { key: "low-latency", label: "Fast" },
  { key: "thinking", label: "Think" },
  { key: "search", label: "Search" },
  { key: "maps", label: "Maps" },
];

type ThreadBadge = "draft" | "done" | "note" | "held";

interface Thread {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  badge?: ThreadBadge;
}

const THREADS: Thread[] = [
  { id: "series-b", title: "Series-B deck edits", subtitle: "with Kai · draft ready", time: "2m", badge: "draft" },
  { id: "meridian", title: "Meridian reschedule", subtitle: "moved to 10:45", time: "1h", badge: "done" },
  { id: "board-pack", title: "Board pack, week 28", subtitle: "62% ready", time: "3h", badge: "note" },
  { id: "notion-q3", title: "Notion: Q3 rituals", subtitle: "outline drafted", time: "5h", badge: "draft" },
  { id: "nyc-route", title: "Location: NYC route", subtitle: "Wed 22 July · JFK → hotel", time: "1d", badge: "held" },
  { id: "legal-nadia", title: "Legal — Nadia", subtitle: "contract sig · terms", time: "2d", badge: "draft" },
  { id: "fitness", title: "Fitness rhythm", subtitle: "morning walk logged", time: "3d", badge: "note" },
];

const BADGE_STYLES: Record<ThreadBadge, string> = {
  draft: "bg-b-accent-soft text-b-accent-text",
  done: "bg-b-success-soft text-b-success",
  note: "bg-b-sunken text-b-text-tertiary",
  held: "bg-b-warning-soft text-b-warning",
};

const SERIES_B_INTRO = `Good morning, Boss. Overnight, Kai sent through the draft slides for the Series-B deck — v9. I read the whole thing and the feedback in the Slack thread. A few observations:

· Slide 4 (traction) and slide 7 (moat) both open with the same graph. Kai flagged this — I've prepared two alternatives.
· The revenue line on slide 3 uses last quarter's number. I updated it against the latest analyst report and re-cited.
· Slide 12 (team) needs Nadia added — I have a placeholder ready.

I've drafted a reply to Kai. It's dry, warm, one paragraph — in your voice.`;

const MODE_LABELS: Record<ChatMode, string> = {
  general: "General",
  "low-latency": "Gemini Flash",
  thinking: "Claude · Thinking mode",
  search: "Search mode",
  maps: "Maps mode",
};

export default function ChatInterface() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeThread, setActiveThread] = useState("series-b");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "model",
      text: SERIES_B_INTRO,
      mode: "thinking",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("thinking");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = THREADS.find((t) => t.id === activeThread) ?? THREADS[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startNewThread = () => {
    setActiveThread("new");
    setMessages([]);
    setThreadId(undefined);
    setInput("");
  };

  const selectThread = (id: string) => {
    setActiveThread(id);
    setThreadId(undefined);
    if (id === "series-b") {
      setMessages([
        {
          id: "intro",
          role: "model",
          text: SERIES_B_INTRO,
          mode: "thinking",
          timestamp: new Date().toISOString(),
        },
      ]);
      setMode("thinking");
    } else {
      setMessages([]);
      setMode("general");
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      mode,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.butler.chat({ text, mode, threadId });
      setThreadId(res.threadId);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: res.text,
        mode,
        timestamp: new Date().toISOString(),
        groundingSources: res.groundingSources,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: `Sorry Boss, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, mode, threadId, sending]);

  return (
    <div className="h-full flex flex-col bg-b-canvas">
      <header className="flex items-center justify-between px-6 py-4 border-b border-b-border-subtle">
        <h2 className="heading-md">Chat with Butler</h2>
        <div className="flex gap-1.5">
          {MODES.map((m) => (
            <Chip
              key={m.key}
              tone={mode === m.key ? "ink" : "neutral"}
              variant={mode === m.key ? "solid" : "soft"}
              className="cursor-pointer"
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </Chip>
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="heading-sm text-b-text-secondary">
              What can I help you with, Boss?
            </p>
            <p className="body-sm text-b-text-tertiary mt-1">
              Ask me anything — calendar, tasks, email, or general questions.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[75%] rounded-[14px] px-4 py-3 ${
              msg.role === "user"
                ? "ml-auto bg-b-ink text-b-text-inverse"
                : "mr-auto bg-b-raised border border-b-border-subtle"
            }`}
          >
            <p className="body-sm whitespace-pre-wrap">{msg.text}</p>
            {msg.groundingSources && msg.groundingSources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-b-border-subtle">
                <p className="mono-label text-b-text-tertiary mb-1">Sources</p>
                {msg.groundingSources.map((s, i) => (
                  <a
                    key={i}
                    href={s.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-b-accent-text body-xs hover:underline"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="mr-auto px-4 py-3 bg-b-raised rounded-[14px] border border-b-border-subtle">
            <span className="body-sm text-b-text-tertiary animate-pulse">
              Butler is thinking...
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-b-border-subtle px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask Butler anything..."
            className="flex-1 bg-b-sunken rounded-[10px] px-4 py-2.5 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent"
          />
          <Button variant="accent" onClick={send} disabled={sending || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
