"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/lib/motion";
import { getIdToken } from "@/lib/firebase";
import ButlerLogo from "./ButlerLogo";

interface VoiceAssistantProps {
  onClose: () => void;
}

type SessionState = "idle" | "connecting" | "listening" | "speaking" | "paused" | "error";

const SUGGESTIONS = [
  "Give me the brief.",
  "What needs me today?",
  "Move my next meeting.",
  "Draft a reply in my voice.",
  "Hold silence until 3.",
];

const WAVEFORM = [
  12, 20, 32, 44, 52, 60, 48, 40, 28, 20, 32, 44, 56, 68, 54, 42, 30, 20, 14, 20, 32, 44, 54, 44, 32,
  20, 14, 20, 32, 44, 52, 44, 32, 20, 12,
];

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [state, setState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const cleanup = useCallback(() => {
    try {
      processorRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    processorRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
