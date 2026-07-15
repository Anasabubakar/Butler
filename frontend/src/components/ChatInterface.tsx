"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Message, ChatMode, ChatThread } from "@/types";
import ButlerLogo from "./ButlerLogo";
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
