"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

type TabKey = "needs" | "handled" | "silenced" | "all";

interface DemoNotification {
  id: string;
  section: string;
  title: string;
  sender: string;
  meta: string;
  badge: string;
  badgeTone: "draft" | "held" | "done";
  accent: "accent" | "warning" | "success";
}

const STATS = [
  { label: "NEEDS YOU", value: "11", sub: "urgent, human decisions", tone: "accent" as const },
  { label: "SILENCED", value: "98", sub: "below your bar", tone: "neutral" as const },
  { label: "REPLIED", value: "24", sub: "drafted & sent by Butler", tone: "success" as const },
  { label: "HELD", value: "15", sub: "waiting on someone else", tone: "warning" as const },
];

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "needs", label: "Needs you · 11" },
  { key: "handled", label: "Handled by Butler · 24" },
  { key: "silenced", label: "Silenced · 98" },
  { key: "all", label: "All sources" },
];

const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n1",
    section: "GMAIL · INBOX",
    title: "RE: Series-B deck v9",
    sender: "Kai Rivera",
    meta: "Draft ready · dry, warm",
    badge: "draft",
    badgeTone: "draft",
    accent: "accent",
  },
  {
    id: "n2",
    section: "GMAIL · INBOX",
    title: "Contract signature · terms",
    sender: "Nadia Ahmed",
    meta: "Draft ready · one clarifying question",
    badge: "draft",
    badgeTone: "draft",
    accent: "accent",
  },
  {
    id: "n3",
    section: "SLACK",
    title: "Deploy window request",
    sender: "Meridian Ops",
    meta: "Held · awaiting Meridian ops",
    badge: "held",
    badgeTone: "held",
    accent: "warning",
  },
  {
    id: "n4",
    section: "GITHUB",
    title: "PR #412 needs your eye",
    sender: "auth-refactor",
    meta: "Butler left a review · awaiting your nod",
    badge: "draft",
    badgeTone: "draft",
    accent: "accent",
  },
];

const BADGE_CLASS: Record<DemoNotification["badgeTone"], string> = {
  draft: "bg-b-accent-soft text-b-accent-text",
  held: "bg-b-warning-soft text-b-warning",
  done: "bg-b-success-soft text-b-success",
};

const ACCENT_CLASS: Record<DemoNotification["accent"], string> = {
  accent: "bg-b-accent",
  warning: "bg-b-warning",
  success: "bg-b-success",
};

function DemoRow({ item }: { item: DemoNotification }) {
  return (
    <div className="relative rounded-[10px] border border-b-border-subtle bg-b-paper min-h-[80px] flex items-center px-6 gap-6">
      <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-[10px] ${ACCENT_CLASS[item.accent]}`} />
      <div className="flex-1 min-w-0 py-4">
        <p className="body-md-med text-b-text-primary">{item.title}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span className="mono-sm text-b-text-tertiary">{item.sender}</span>
          <span className="body-sm text-b-text-secondary">{item.meta}</span>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-[4px] mono-label ${BADGE_CLASS[item.badgeTone]}`}>
        {item.badge}
      </span>
      <button
        type="button"
        className="px-3 py-2 rounded-full bg-b-ink mono-label text-b-text-inverse hover:opacity-90 transition-opacity cursor-pointer shrink-0"
      >
        Open →
      </button>
    </div>
  );
}

export default function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [tab, setTab] = useState<TabKey>("needs");
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const showDemo = !loading && items.length === 0;

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[1400px]">
        <h1 className="display-s text-b-text-primary">Notifications Desk</h1>
        <p className="body-lg mt-4 text-b-text-secondary max-w-3xl">
          Butler has triaged 148 items today. Eleven need you. Everything else was answered, filed, or silenced.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-[10px] border border-b-border-subtle bg-b-paper p-4 min-h-[90px]"
            >
              <p
                className={`mono-label ${
                  s.tone === "accent"
                    ? "text-b-accent-text"
                    : s.tone === "success"
                    ? "text-b-success"
                    : s.tone === "warning"
                    ? "text-b-warning"
                    : "text-b-text-tertiary"
                }`}
              >
                {s.label}
              </p>
              <p className="display-s mt-1 text-[32px] leading-[40px]">{s.value}</p>
              <p className="body-sm text-b-text-tertiary mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-6 mt-10 border-b border-b-border-subtle pb-3">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`pb-1 relative body-md-med transition-colors cursor-pointer ${
                tab === key ? "text-b-text-primary" : "text-b-text-tertiary hover:text-b-text-secondary"
              }`}
            >
              {label}
              {tab === key && (
                <span className="absolute left-0 right-0 -bottom-3 h-0.5 bg-b-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          {loading ? (
            <p className="body-sm text-b-text-tertiary animate-pulse">Loading…</p>
          ) : showDemo ? (
            <>
              <p className="mono-label text-b-text-tertiary">GMAIL · INBOX</p>
              {DEMO_NOTIFICATIONS.filter((n) => n.section.includes("GMAIL")).map((n) => (
                <DemoRow key={n.id} item={n} />
              ))}
              <p className="mono-label text-b-text-tertiary pt-2">SLACK</p>
              {DEMO_NOTIFICATIONS.filter((n) => n.section === "SLACK").map((n) => (
                <DemoRow key={n.id} item={n} />
              ))}
              <p className="mono-label text-b-text-tertiary pt-2">GITHUB</p>
              {DEMO_NOTIFICATIONS.filter((n) => n.section === "GITHUB").map((n) => (
                <DemoRow key={n.id} item={n} />
              ))}
            </>
          ) : items.length === 0 ? (
            <p className="body-sm text-b-text-secondary">All clear, Boss.</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => !n.read && handleMarkRead(n.id)}
                onKeyDown={(e) => e.key === "Enter" && !n.read && handleMarkRead(n.id)}
                className={`relative rounded-[10px] border border-b-border-subtle bg-b-paper min-h-[80px] flex items-center px-6 gap-6 cursor-pointer ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                {!n.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[10px] bg-b-accent" />
                )}
                <div className="flex-1 min-w-0 py-4">
                  <p className="body-md-med text-b-text-primary">{n.title}</p>
                  <p className="body-sm text-b-text-secondary mt-1 line-clamp-2">{n.body}</p>
                </div>
                <span className="mono-sm text-b-text-tertiary">{n.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}