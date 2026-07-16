"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Message, ChatMode, ChatThread } from "@/types";
import ButlerLogo from "./ButlerLogo";
import GlidingTabs from "./GlidingTabs";
import { fadeUp, usePrefersReducedMotion } from "@/lib/motion";

const MODES: { key: ChatMode; label: string }[] = [
  { key: "general", label: "General" },
  { key: "low-latency", label: "Fast" },
  { key: "thinking", label: "Think" },
  { key: "search", label: "Search" },
  { key: "maps", label: "Maps" },
];

const MODE_LABELS: Record<ChatMode, string> = {
  general: "General",
  "low-latency": "Gemini Flash",
  thinking: "Thinking mode",
  search: "Search mode",
  maps: "Maps mode",
};

function formatRelative(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d >= 7) return `${Math.floor(d / 7)}w`;
  if (d >= 1) return `${d}d`;
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m}m`;
  return "now";
}

function normalizeMessage(raw: Message): Message {
  return {
    ...raw,
    role: raw.role === "user" ? "user" : "model",
    timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
  };
}

export default function ChatInterface() {
  const reducedMotion = usePrefersReducedMotion();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | "new">("new");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setError(null);
    try {
      const data = await api.chat.threads();
      setThreads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const startNewThread = () => {
    setActiveThreadId("new");
    setMessages([]);
    setThreadId(undefined);
    setInput("");
    setError(null);
  };

  const selectThread = async (id: string) => {
    setActiveThreadId(id);
    setThreadId(id);
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await api.chat.messages(id);
      setMessages(data.map(normalizeMessage));
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
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
    setError(null);

    try {
      const res = await api.butler.chat({ text, mode, threadId });
      setThreadId(res.threadId);
      setActiveThreadId(res.threadId);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: res.text,
        mode,
        timestamp: new Date().toISOString(),
        groundingSources: res.groundingSources,
        delegationIds: res.delegationIds,
        actionsQueued: res.actionsQueued,
      };
      setMessages((prev) => [...prev, botMsg]);
      await loadThreads();
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
  }, [input, mode, threadId, sending, loadThreads]);

  return (
    <div className="h-full flex bg-b-canvas overflow-hidden">
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-b-border-subtle bg-b-sunken">
        <div className="px-5 pt-7 pb-4">
          <h2 className="type-h3 text-b-text-primary">Conversations</h2>
          <p className="mono-sm text-b-text-tertiary mt-1">
            {loadingThreads
              ? "Loading…"
              : `${threads.length} thread${threads.length === 1 ? "" : "s"} · with Butler`}
          </p>
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
          {loadingThreads && (
            <p className="body-sm text-b-text-tertiary px-2 py-3 animate-pulse">Loading conversations…</p>
          )}
          {!loadingThreads && threads.length === 0 && (
            <p className="body-sm text-b-text-tertiary px-2 py-3">
              No conversations yet. Start one — Butler will keep the history.
            </p>
          )}
          {threads.map((t) => {
            const isActive = activeThreadId === t.id;
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
                  <p className="body-md-med text-b-text-primary truncate">{t.title || "Untitled"}</p>
                  <span className="mono-sm text-b-text-tertiary shrink-0">
                    {formatRelative(t.lastMessageAt || t.updatedAt)}
                  </span>
                </div>
                {t.subtitle && (
                  <p className="body-sm text-b-text-tertiary mt-0.5 truncate">{t.subtitle}</p>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[72px] shrink-0 flex items-center justify-between px-10 border-b border-b-border-subtle">
          <div>
            <h1 className="body-md-med text-b-text-primary">
              {activeThreadId === "new" ? "New conversation" : activeThread?.title || "Conversation"}
            </h1>
            <p className="mono-sm text-b-text-tertiary mt-0.5">with Butler · your chief of staff</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-b-paper border border-b-border-subtle">
            <span className="text-b-accent text-[10px]" aria-hidden>
              ●
            </span>
            <span className="mono-label text-b-text-secondary">{MODE_LABELS[mode]}</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-6">
          {loadingMessages && (
            <p className="body-sm text-b-text-tertiary animate-pulse">Loading messages…</p>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ButlerLogo size={48} variant="dark" />
              <p className="type-h3 text-b-text-secondary mt-4">What can I help you with, Boss?</p>
              <p className="body-sm text-b-text-tertiary mt-2 max-w-md">
                Ask about your calendar, draft a reply, research something, or just think out loud.
              </p>
            </div>
          )}

          {error && messages.length === 0 && (
            <p className="body-sm text-b-danger mb-4" role="alert">
              {error}
            </p>
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
                      <p className="mono-label text-b-text-tertiary mb-2">Butler · in your voice</p>
                      <p className="body-md text-b-text-primary whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-b-border-subtle">
                          <p className="mono-label text-b-text-tertiary mb-1">Sources</p>
                          {msg.groundingSources.map((s, i) => (
                            <a
                              key={`${s.uri}-${i}`}
                              href={s.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-b-accent-text body-sm hover:underline"
                            >
                              {s.title}
                            </a>
                          ))}
                        </div>
                      )}
                      {((msg.delegationIds && msg.delegationIds.length > 0) ||
                        (msg.actionsQueued && msg.actionsQueued > 0)) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.delegationIds && msg.delegationIds.length > 0 ? (
                            msg.delegationIds.map((id) => (
                              <Link
                                key={id}
                                href={`/dashboard/delegation?focus=${encodeURIComponent(id)}`}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-b-accent text-b-text-on-accent body-sm-med hover:opacity-90 transition-opacity"
                              >
                                Review delegation →
                              </Link>
                            ))
                          ) : (
                            <Link
                              href="/dashboard/delegation"
                              className="inline-flex items-center px-3 py-1.5 rounded-full bg-b-accent text-b-text-on-accent body-sm-med hover:opacity-90 transition-opacity"
                            >
                              Open Delegated Work →
                            </Link>
                          )}
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
              <p className="body-sm text-b-text-tertiary animate-pulse pt-1">Butler is thinking…</p>
            </motion.div>
          )}
        </div>

        <div className="shrink-0 px-10 pb-8">
          <div className="rounded-[20px] border border-b-border-default bg-b-raised shadow-[0_8px_24px_rgba(26,15,8,0.08)] p-5">
            <p className="body-lg text-b-text-tertiary mb-4">Ask Butler — or paste, dictate, plan.</p>

            <GlidingTabs
              className="mb-4"
              variant="pill"
              aria-label="Chat mode"
              tabs={MODES.map((m) => ({ key: m.key, label: m.label }))}
              value={mode}
              onChange={(key) => setMode(key as ChatMode)}
            />

            <div className="flex items-center gap-3">
              <label htmlFor="butler-chat-input" className="sr-only">
                Message Butler
              </label>
              <input
                id="butler-chat-input"
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
