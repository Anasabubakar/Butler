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
