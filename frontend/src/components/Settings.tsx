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
    try {
      await onReconnectWorkspace();
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[900px]">
        <h1 className="display-s text-b-text-primary">Settings</h1>
        <p className="body-lg mt-4 text-b-text-secondary">
          Your profile, Butler&apos;s voice, AI routing, and location preferences.
        </p>

        {error && (
          <p className="body-sm text-b-danger mt-4" role="alert">
            {error}
          </p>
        )}
        {savedAt && !error && (
          <p className="mono-sm text-b-success mt-4">Saved · {savedAt}</p>
        )}

        <div className="flex flex-col gap-8 mt-10">
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-4 text-b-accent-text">Profile</div>
            <div className="flex items-center gap-5 flex-wrap">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-b-accent-soft">
                  <span className="type-h3 text-b-accent-text">
                    {(user?.displayName?.[0] || "B").toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <div className="type-h4 text-b-text-primary">
                  {user?.displayName || "Boss"}
                </div>
                <div className="body-sm mt-1 text-b-text-tertiary">
                  {user?.email || "—"}
                </div>
                <div className="mono-sm mt-1 text-b-text-tertiary">
                  Google Workspace · {hasWorkspace ? "connected" : "not connected"}
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex gap-2">
                {!hasWorkspace && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReconnect}
                    disabled={reconnecting}
                  >
                    {reconnecting ? "Connecting…" : "Connect Workspace"}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={onSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </Card>

          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1 text-b-accent-text">Voice tone</div>
            <div className="body-sm mb-6 text-b-text-tertiary">
              How Butler writes and speaks on your behalf.
            </div>

            {loading ? (
              <p className="body-sm text-b-text-tertiary animate-pulse">Loading…</p>
            ) : (
              <div className="flex flex-col gap-6">
                <SliderRow
                  label="Warmth"
                  value={warmth}
                  onChange={setWarmth}
                  low="Clinical"
                  high="Warm"
                />
                <SliderRow
                  label="Formality"
                  value={formality}
                  onChange={setFormality}
                  low="Casual"
                  high="Formal"
