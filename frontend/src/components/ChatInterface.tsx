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
