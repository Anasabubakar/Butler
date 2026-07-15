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
                />
                <SliderRow
                  label="Brevity"
                  value={brevity}
                  onChange={setBrevity}
                  low="Verbose"
                  high="Terse"
                />
                <div className="flex justify-end">
                  <Button variant="accent" size="sm" onClick={() => save()} disabled={saving}>
                    {saving ? "Saving…" : "Save voice"}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1 text-b-accent-text">Default chat mode</div>
            <div className="body-sm mb-4 text-b-text-tertiary">
              Preferred model path when you open a new conversation.
            </div>
            <div className="flex flex-wrap gap-2">
              {["general", "low-latency", "thinking", "search", "maps"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setChatMode(m);
                    save({ chatMode: m });
                  }}
                  className={`px-3 py-2 rounded-full mono-label cursor-pointer transition-colors ${
                    chatMode === m
                      ? "bg-b-ink text-b-text-inverse"
                      : "border border-b-border-default text-b-text-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Card>

          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1 text-b-accent-text">AI routing</div>
            <div className="body-sm mb-6 text-b-text-tertiary">
              Models Butler uses today. Routing is handled server-side via Gemini.
            </div>
            <div className="flex flex-col gap-0">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-2 border-b border-b-border-subtle">
                <span className="mono-label text-b-text-tertiary">Task</span>
                <span className="mono-label text-b-text-tertiary">Model</span>
                <span className="mono-label text-b-text-tertiary">Status</span>
              </div>
              {ROUTING_TABLE.map((row) => (
                <div
                  key={row.task}
                  className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 items-center border-b border-b-border-subtle"
                >
                  <span className="body-md-med text-b-text-primary">{row.task}</span>
                  <span className="body-sm text-b-text-secondary">{row.model}</span>
                  <Chip tone={row.tone}>{row.status}</Chip>
                </div>
              ))}
            </div>
          </Card>

          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1 text-b-accent-text">Location</div>
            <div className="body-sm mb-6 text-b-text-tertiary">
              Used for weather context, travel, and time-aware scheduling.
            </div>

            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="min-w-0 flex-1">
                <div className="type-h4 text-b-text-primary">
                  {locationAuto ? "Auto-detect" : "Manual"}
                </div>
                {!locationAuto && (
                  <input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    onBlur={() => save()}
                    placeholder="City, region"
                    className="mt-2 w-full max-w-sm bg-b-sunken rounded-[10px] px-3 py-2 body-sm outline-none border border-transparent focus:border-b-accent"
                  />
                )}
                {locationAuto && locationText && (
                  <div className="body-sm mt-1 text-b-text-tertiary">
                    Currently: {locationText}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-pressed={locationAuto}
                onClick={() => {
                  const next = !locationAuto;
                  setLocationAuto(next);
                  save({ locationAutoDetect: next });
                }}
                className="w-12 h-7 rounded-full p-1 transition-colors shrink-0"
                style={{
                  background: locationAuto ? "var(--color-b-accent)" : "var(--color-b-sunken)",
                }}
              >
                <div
                  className="w-5 h-5 rounded-full transition-transform"
                  style={{
                    background: "var(--color-b-raised)",
                    transform: locationAuto ? "translateX(20px)" : "translateX(0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            <div className="rounded-[10px] p-4 bg-b-sunken">
              <div className="mono-sm text-b-text-tertiary">
                Butler never shares your precise coordinates with third parties. Location is used for
                timezone, weather, and travel suggestions only.
              </div>
            </div>
          </Card>

          <Card tone="paper" className="p-6">
            <div className="mono-label mb-4 text-b-danger">Danger zone</div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="body-md-med text-b-text-primary">Clear local browser data</div>
                <div className="body-sm mt-1 text-b-text-tertiary">
                  Clears session tokens stored in this browser. Cloud data is unaffected.
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (window.confirm("Clear local session data and reload?")) {
                    sessionStorage.clear();
                    localStorage.clear();
                    window.location.href = "/login";
                  }
                }}
              >
                Clear data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="body-md-med text-b-text-primary">{label}</span>
        <span className="mono-label text-b-accent-text">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: "var(--color-b-sunken)", accentColor: "var(--color-b-accent)" }}
        aria-label={label}
      />
      <div className="flex justify-between mt-1">
        <span className="mono-sm text-b-text-tertiary">{low}</span>
        <span className="mono-sm text-b-text-tertiary">{high}</span>
      </div>
    </div>
  );
}
