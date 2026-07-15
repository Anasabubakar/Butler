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
      setItems(data);
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

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-b-canvas">
      <header className="px-6 py-4 border-b border-b-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="heading-md">Notifications</h2>
            {unreadCount > 0 && (
              <Chip tone="accent" variant="solid">{unreadCount}</Chip>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="flex gap-1.5 mt-3">
          {SOURCES.map((s) => (
            <Chip
              key={s}
              tone={source === s ? "ink" : "neutral"}
              variant={source === s ? "solid" : "soft"}
              className="cursor-pointer capitalize"
              onClick={() => setSource(s)}
            >
              {s}
            </Chip>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {loading ? (
          <p className="body-sm text-b-text-tertiary animate-pulse">Loading...</p>
        ) : items.length === 0 ? (
          <p className="body-sm text-b-text-secondary">All clear, Boss.</p>
        ) : (
          items.map((n) => (
            <Card
              key={n.id}
              tone={n.read ? "paper" : "raised"}
              radius="md"
              className={`p-3 cursor-pointer transition-opacity ${n.read ? "opacity-60" : ""}`}
              onClick={() => !n.read && handleMarkRead(n.id)}
            >
              <div className="flex items-start gap-3">
                {!n.read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-b-accent shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Chip tone={n.tone} variant="soft">{n.source}</Chip>
                    <span className="body-xs text-b-text-tertiary">{n.time}</span>
                  </div>
                  <p className="heading-xs mt-1 truncate">{n.title}</p>
                  <p className="body-xs text-b-text-secondary mt-0.5 line-clamp-2">{n.body}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
