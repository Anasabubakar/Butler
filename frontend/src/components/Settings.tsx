"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";
import { api } from "@/lib/api";
import type { UserSettings } from "@/types";

interface SettingsProps {
  user: User | null;
  hasWorkspace: boolean;
  onSignOut: () => void;
  onReconnectWorkspace: () => Promise<boolean>;
}

const ROUTING_TABLE: Array<{
  task: string;
  model: string;
  status: string;
  tone: "accent" | "success" | "neutral";
}> = [
  { task: "Writing & replies", model: "Gemini Pro", status: "active", tone: "accent" },
  { task: "Research & search", model: "Gemini + Search", status: "active", tone: "accent" },
  { task: "Quick drafts", model: "Gemini Flash", status: "active", tone: "success" },
  { task: "Deep reasoning", model: "Gemini Thinking", status: "active", tone: "accent" },
  { task: "Maps & location", model: "Gemini Maps", status: "active", tone: "accent" },
  { task: "Voice (live)", model: "Gemini Live", status: "active", tone: "success" },
  { task: "Image analysis", model: "Gemini Pro", status: "active", tone: "neutral" },
];

export default function Settings({
  user,
  hasWorkspace,
  onSignOut,
  onReconnectWorkspace,
}: SettingsProps) {
  const [warmth, setWarmth] = useState(72);
  const [formality, setFormality] = useState(55);
  const [brevity, setBrevity] = useState(80);
  const [locationAuto, setLocationAuto] = useState(true);
  const [locationText, setLocationText] = useState("");
  const [chatMode, setChatMode] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.settings.get();
      setWarmth(s.warmth ?? 72);
      setFormality(s.formality ?? 55);
      setBrevity(s.brevity ?? 80);
      setLocationAuto(s.locationAutoDetect ?? true);
      setLocationText(s.locationText ?? "");
      setChatMode(s.chatMode ?? "general");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (partial?: Partial<UserSettings>) => {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<UserSettings> = {
        warmth,
        formality,
        brevity,
        locationAutoDetect: locationAuto,
        locationText,
        chatMode,
        ...partial,
      };
      await api.settings.update(payload);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
