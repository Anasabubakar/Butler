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
    <div className="h-full flex bg-b-canvas overflow-hidden">
      {/* Conversation list — Figma 280px panel */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-b-border-subtle bg-b-sunken">
        <div className="px-5 pt-7 pb-4">
          <h2 className="h-3 text-b-text-primary">Conversations</h2>
          <p className="mono-sm text-b-text-tertiary mt-1">14 active · with Butler</p>
        </div>

        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={startNewThread}
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-full bg-b-ink text-b-text-inverse body-sm-med hover:opacity-90 transition-opacity cursor-pointer"
          >
            + Begin a new thread
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-1">
          {THREADS.map((t) => {
            const isActive = activeThread === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectThread(t.id)}
                className={`w-full text-left rounded-[10px] px-4 py-3 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-b-paper border border-b-border-subtle"
                    : "hover:bg-b-paper/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="body-md-med text-b-text-primary truncate">{t.title}</p>
                  <span className="mono-sm text-b-text-tertiary shrink-0">{t.time}</span>
                </div>
                <p className="body-sm text-b-text-tertiary mt-0.5 truncate">{t.subtitle}</p>
                {t.badge && (
                  <span
                    className={`inline-block mt-2 px-1.5 py-0.5 rounded-[4px] mono-label ${BADGE_STYLES[t.badge]}`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main chat pane */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] shrink-0 flex items-center justify-between px-10 border-b border-b-border-subtle">
          <div>
            <h1 className="body-md-med text-b-text-primary">
              {activeThread === "new" ? "New conversation" : thread.title}
            </h1>
            <p className="mono-sm text-b-text-tertiary mt-0.5">
              {activeThread === "series-b"
                ? "with Kai Rivera · connected to Slack, Notion, GDrive"
                : "with Butler · your chief of staff"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-b-paper border border-b-border-subtle">
            <span className="text-b-accent text-[10px]">●</span>
            <span className="mono-label text-b-text-secondary">{MODE_LABELS[mode]}</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-6">
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

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`mb-6 ${msg.role === "user" ? "flex justify-end" : ""}`}
              >
                {msg.role === "model" ? (
                  <div className="flex gap-3 max-w-[720px]">
                    <div className="w-8 h-8 shrink-0 rounded-[8px] bg-b-accent-soft flex items-center justify-center overflow-hidden">
                      <ButlerLogo size={24} variant="dark" />
                    </div>
                    <div className="min-w-0">
                      <p className="mono-label text-b-text-tertiary mb-2">
                        Butler · in your voice
                      </p>
                      <p className="body-md text-b-text-primary whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-b-border-subtle">
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
                      {activeThread === "series-b" && msg.id === "intro" && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-full bg-b-accent text-b-text-on-accent body-sm-med hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Approve reply
                          </button>
                          <button
                            type="button"
                            className="px-3.5 py-2 rounded-full border border-b-border-default body-sm-med text-b-text-primary hover:bg-b-sunken transition-colors cursor-pointer"
                          >
                            Show alternatives
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[560px] px-4 py-3 rounded-[14px] bg-b-ink text-b-text-inverse">
                    <p className="body-md whitespace-pre-wrap">{msg.text}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {sending && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex gap-3 max-w-[720px]"
            >
              <div className="w-8 h-8 shrink-0 rounded-[8px] bg-b-accent-soft flex items-center justify-center">
                <ButlerLogo size={24} variant="dark" />
              </div>
              <p className="body-sm text-b-text-tertiary animate-pulse pt-1">
                Butler is thinking...
              </p>
            </motion.div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 px-10 pb-8">
          <div className="rounded-[20px] border border-b-border-default bg-b-raised shadow-[0_8px_24px_rgba(26,15,8,0.08)] p-5">
            <p className="body-lg text-b-text-tertiary mb-4">
              Ask Butler — or paste, drag, dictate.
            </p>

            <div className="flex flex-wrap gap-1 p-1.5 rounded-full bg-b-sunken w-fit mb-4">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`px-3 py-1.5 rounded-full body-sm-med transition-colors cursor-pointer ${
                    mode === m.key
                      ? "bg-b-raised text-b-text-primary shadow-sm"
                      : "text-b-text-secondary hover:text-b-text-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Message Butler..."
                className="flex-1 bg-transparent body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                className="px-5 py-2 rounded-full bg-b-ink text-b-text-inverse body-sm-med hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}