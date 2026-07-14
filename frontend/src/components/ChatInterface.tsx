"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Message, ChatMode } from "@/types";
import Button from "./Button";
import Chip from "./Chip";

const MODES: { key: ChatMode; label: string }[] = [
  { key: "general", label: "General" },
  { key: "low-latency", label: "Fast" },
  { key: "thinking", label: "Think" },
  { key: "search", label: "Search" },
  { key: "maps", label: "Maps" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
