"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Notification } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

const SOURCES = ["all", "calendar", "gmail", "tasks", "drive", "butler"];

export default function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([]);
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications.list(source === "all" ? undefined : source);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      fetchItems();
    } catch {}
  };

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
