"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Message, ChatMode, ChatThread } from "@/types";
import ButlerLogo from "./ButlerLogo";
import GlidingTabs from "./GlidingTabs";
import { fadeUp, usePrefersReducedMotion } from "@/lib/motion";
import Icon from "./Icon";

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

  // Advanced feature states
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [attachment, setAttachment] = useState<{
    name: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

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

  // Prefill from Command Center expanding search or Voice Room handoff
  useEffect(() => {
    try {
      const search = sessionStorage.getItem("butler_search_handoff");
      const voice = sessionStorage.getItem("butler_voice_handoff");
      const handoff = search || voice;
      if (handoff) {
        setInput(handoff);
        sessionStorage.removeItem("butler_search_handoff");
        sessionStorage.removeItem("butler_voice_handoff");
        setActiveThreadId("new");
        setThreadId(undefined);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle history dropdown CMD+/ or Ctrl+/
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowHistoryDropdown((prev) => !prev);
      }
      // Esc clears attachment
      if (e.key === "Escape") {
        setAttachment(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const startNewThread = () => {
    setActiveThreadId("new");
    setMessages([]);
    setThreadId(undefined);
    setInput("");
    setError(null);
    setAttachment(null);
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

  // Drag and Drop Handlers
  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(",")[1];
      setAttachment({
        name: file.name,
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Voice speech handler
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        setInput((prev) => (prev + " " + result[0].transcript).trim());
        if (textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
            }
          }, 50);
        }
      }
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && !attachment) return;
    if (sending) return;

    const userMsgText = attachment ? `[Attachment: ${attachment.name}] ${text}`.trim() : text;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: userMsgText,
      mode,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const activeAttachment = attachment;
    setAttachment(null);
    setSending(true);
    setError(null);

    try {
      let botResponseText = "";
      let botGroundingSources: Array<{ title: string; uri: string }> = [];
      let botDelegationIds: string[] = [];
      let botActionsQueued = 0;

      if (activeAttachment) {
        // Run vision/file analysis
        const res = await api.butler.analyze({
          fileBase64: activeAttachment.base64,
          mimeType: activeAttachment.mimeType,
          prompt: text || "Analyze this upload",
        });
        botResponseText = res.text;
      } else {
        // Run standard chat
        const res = await api.butler.chat({ text, mode, threadId });
        setThreadId(res.threadId);
        setActiveThreadId(res.threadId);
        botResponseText = res.text;
        botGroundingSources = res.groundingSources || [];
        botDelegationIds = res.delegationIds || [];
        botActionsQueued = res.actionsQueued || 0;
      }

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: botResponseText,
        mode,
        timestamp: new Date().toISOString(),
        groundingSources: botGroundingSources,
        delegationIds: botDelegationIds,
        actionsQueued: botActionsQueued,
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
  }, [input, mode, threadId, sending, attachment, loadThreads]);

  return (
    <div
      className="h-full flex bg-b-canvas overflow-hidden relative"
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      <AnimatePresence>
        {dragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-b-ink/20 backdrop-blur-xs z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-b-paper border-2 border-dashed border-b-accent-text rounded-[20px] p-10 flex flex-col items-center justify-center gap-3 shadow-xl">
              <Icon name="link" size={40} className="text-b-accent animate-bounce" />
              <p className="type-h3 text-b-text-primary">Drop file to attach</p>
              <p className="body-sm text-b-text-tertiary">Image, PDF, or text document</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Conversation Pane */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-b-canvas">
        <header className="h-[72px] shrink-0 flex items-center justify-between px-10 border-b border-b-border-subtle bg-b-paper select-none">
          <div className="flex items-center gap-3">
            
            {/* History Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHistoryDropdown((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-b-border-subtle bg-b-paper hover:bg-b-sunken transition-all hover:scale-[1.03] cursor-pointer text-b-text-secondary body-sm-med"
                title="View conversations history (CMD+/)"
              >
                <Icon name="grid" size={16} />
                <span>History</span>
              </button>

              <AnimatePresence>
                {showHistoryDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowHistoryDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 mt-2 w-80 max-h-[480px] bg-b-paper border border-b-border-default rounded-[16px] shadow-lg z-50 flex flex-col p-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-b-border-subtle/80 pb-2.5 mb-2.5 select-none">
                        <span className="mono-label text-b-text-tertiary">Conversations</span>
                        <button
                          type="button"
                          onClick={() => {
                            startNewThread();
                            setShowHistoryDropdown(false);
                          }}
                          className="text-b-accent-text hover:underline body-xs font-semibold cursor-pointer"
                        >
                          + New Thread
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1.5 pr-1">
                        {loadingThreads && (
                          <p className="body-sm text-b-text-tertiary animate-pulse p-3 text-center">
                            Loading…
                          </p>
                        )}
                        {!loadingThreads && threads.length === 0 && (
                          <p className="body-sm text-b-text-tertiary p-3 text-center">
                            No past conversations.
                          </p>
                        )}
                        {threads.map((t) => {
                          const isActive = activeThreadId === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void selectThread(t.id);
                                setShowHistoryDropdown(false);
                              }}
                              className={`w-full text-left rounded-[10px] px-3.5 py-2.5 border transition-all cursor-pointer ${
                                isActive
                                  ? "bg-b-sunken border-b-border-subtle"
                                  : "border-transparent hover:bg-b-sunken/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="body-sm-med text-b-text-primary truncate">
                                  {t.title || "Untitled"}
                                </p>
                                <span className="mono-sm text-b-text-tertiary text-[10px] shrink-0 mt-0.5">
                                  {formatRelative(t.lastMessageAt || t.updatedAt)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-1">
              <h2 className="body-md-med text-b-text-primary">
                {activeThreadId === "new" ? "New conversation" : activeThread?.title || "Conversation"}
              </h2>
              <p className="mono-sm text-b-text-tertiary mt-0.5">with Butler · assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-b-sunken border border-b-border-subtle">
            <span className="text-b-accent text-[9px] animate-pulse" aria-hidden>
              ●
            </span>
            <span className="mono-label text-b-text-secondary">{MODE_LABELS[mode]}</span>
          </div>
        </header>

        {/* Scrollable messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-6">
          {loadingMessages && (
            <p className="body-sm text-b-text-tertiary animate-pulse text-center py-10">
              Loading messages…
            </p>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center select-none py-10">
              <ButlerLogo size={44} variant="dark" />
              <p className="type-h2 text-b-text-secondary mt-5">What can I handle, Boss?</p>
              <p className="body-sm text-b-text-tertiary mt-2 max-w-sm">
                Ask about calendar conflicts, draft replies, analyze uploads, or dictate notes.
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
                      <p className="mono-label text-b-text-tertiary mb-2">Butler · assistant</p>
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

        {/* Input area */}
        <div className="shrink-0 px-10 pb-8 select-none">
          <div className="rounded-[24px] border border-b-border-default bg-b-raised shadow-[0_8px_24px_rgba(26,15,8,0.08)] p-5 flex flex-col gap-4">
            
            {/* Attachment preview */}
            {attachment && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-b-sunken border border-b-border-subtle self-start">
                <span className="body-xs text-b-text-secondary truncate max-w-[240px]">
                  📎 {attachment.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-b-accent-text hover:text-b-text-primary cursor-pointer font-bold body-xs"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex items-end gap-3 min-w-0">
              {/* Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                accept="image/*,application/pdf,text/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 shrink-0 rounded-full border border-b-border-subtle bg-b-paper hover:bg-b-sunken flex items-center justify-center transition-colors cursor-pointer text-b-text-secondary"
                title="Attach file"
              >
                <Icon name="link" size={18} />
              </button>

              <div className="flex-1 min-w-0 bg-b-sunken/40 border border-b-border-subtle/60 rounded-[16px] px-4 py-2.5 flex items-center">
                <textarea
                  id="butler-chat-input"
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-grow height logic
                    if (textareaRef.current) {
                      textareaRef.current.style.height = "auto";
                      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Message Butler... (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 bg-transparent body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none resize-none leading-relaxed min-h-[24px]"
                  style={{ height: "auto" }}
                />
              </div>

              {/* Voice recognition button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-11 h-11 shrink-0 rounded-full border border-b-border-subtle bg-b-paper flex items-center justify-center cursor-pointer transition-all hover:scale-105
                  ${isListening ? "bg-b-accent-soft text-b-accent animate-pulse" : "hover:bg-b-sunken text-b-text-secondary"}`}
                title={isListening ? "Stop voice listening" : "Start voice listening"}
              >
                <Icon name="mic" size={20} />
              </button>

              {/* Send button */}
              <button
                type="button"
                onClick={send}
                disabled={sending || (!input.trim() && !attachment)}
                className="px-5 h-11 shrink-0 rounded-full bg-b-ink text-b-text-inverse body-sm-med hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                Send
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-1 pt-3 border-t border-b-border-subtle/50">
              <GlidingTabs
                variant="pill"
                aria-label="Chat mode"
                tabs={MODES.map((m) => ({ key: m.key, label: m.label }))}
                value={mode}
                onChange={(key) => setMode(key as ChatMode)}
              />
              <span className="mono-sm text-b-text-tertiary text-[11px] select-none">
                Shift + Enter for new line
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
