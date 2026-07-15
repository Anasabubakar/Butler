"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { Notification } from "@/types";
import Button from "./Button";

type TabKey = "unread" | "read" | "all";

function formatTime(n: Notification) {
  const iso = n.time || n.createdAt;
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "just now";
}

export default function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [tab, setTab] = useState<TabKey>("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notifications.list();
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const unread = useMemo(() => items.filter((n) => !n.read), [items]);
  const read = useMemo(() => items.filter((n) => n.read), [items]);

  const visible = tab === "unread" ? unread : tab === "read" ? read : items;

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark read");
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.notifications.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all read");
    }
  };

  const stats = [
    {
      label: "NEEDS YOU",
      value: String(unread.length),
      sub: "unread decisions",
      tone: "accent" as const,
    },
    {
      label: "TOTAL",
      value: String(items.length),
      sub: "in your desk",
      tone: "neutral" as const,
    },
    {
      label: "READ",
      value: String(read.length),
      sub: "already handled",
      tone: "success" as const,
    },
    {
      label: "SOURCES",
      value: String(new Set(items.map((n) => n.source || "butler")).size),
      sub: "active channels",
      tone: "warning" as const,
    },
  ];

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "unread", label: `Needs you · ${unread.length}` },
    { key: "read", label: `Read · ${read.length}` },
    { key: "all", label: `All · ${items.length}` },
  ];

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[1400px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="display-s text-b-text-primary">Notifications Desk</h1>
            <p className="body-lg mt-4 text-b-text-secondary max-w-3xl">
              {items.length === 0
                ? "Your desk is clear. Butler will surface what needs a decision."
                : `${unread.length} need${unread.length === 1 ? "s" : ""} you. The rest is filed.`}
            </p>
          </div>
          {unread.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAll} className="shrink-0 mt-2">
              Mark all read
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {stats.map((s) => (
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
          {tabs.map(({ key, label }) => (
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

        <div className="mt-8 space-y-3">
          {error && (
            <p className="body-sm text-b-danger" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p className="body-sm text-b-text-tertiary animate-pulse">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-[10px] border border-b-border-subtle bg-b-paper p-10 text-center">
              <p className="type-h4 text-b-text-primary">All clear, Boss.</p>
              <p className="body-sm text-b-text-secondary mt-2">
                No notifications in this view. Connect services or wait for Butler to surface work.
