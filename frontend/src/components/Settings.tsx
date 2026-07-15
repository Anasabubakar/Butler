"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

interface SettingsProps {
  user: User | null;
  onSignOut: () => void;
}

export default function Settings({ user, onSignOut }: SettingsProps) {
  const [voiceWarmth, setVoiceWarmth] = useState(72);
  const [voiceFormality, setVoiceFormality] = useState(55);
  const [voiceBrevity, setVoiceBrevity] = useState(80);
  const [locationAuto, setLocationAuto] = useState(true);

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "var(--color-b-canvas)" }}>
      <div className="px-14 pt-14 pb-14 max-w-[900px]">
        <h1 className="display-s" style={{ color: "var(--color-b-text-primary)" }}>Settings</h1>
        <p className="body-lg mt-4" style={{ color: "var(--color-b-text-secondary)" }}>
          Your profile, Butler&apos;s voice, AI routing, and location preferences.
        </p>

        <div className="flex flex-col gap-8 mt-10">
          {/* PROFILE CARD */}
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-4" style={{ color: "var(--color-b-accent-text)" }}>Profile</div>
            <div className="flex items-center gap-5">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="w-14 h-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "var(--color-b-accent-soft)" }}
                >
                  <span className="type-h3" style={{ color: "var(--color-b-accent-text)" }}>
                    {(user?.displayName?.[0] || "B").toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="type-h4" style={{ color: "var(--color-b-text-primary)" }}>
                  {user?.displayName || "Boss"}
                </div>
                <div className="body-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
                  {user?.email || "demo@butler.ai"}
                </div>
                <div className="mono-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
                  Google Workspace · connected
                </div>
              </div>
              <div className="flex-1" />
              <Button variant="secondary" size="sm" onClick={onSignOut}>Sign out</Button>
            </div>
          </Card>

          {/* VOICE TONE SLIDERS */}
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1" style={{ color: "var(--color-b-accent-text)" }}>Voice tone</div>
            <div className="body-sm mb-6" style={{ color: "var(--color-b-text-tertiary)" }}>
              How Butler writes and speaks on your behalf.
            </div>

            <div className="flex flex-col gap-6">
              <SliderRow
                label="Warmth"
                value={voiceWarmth}
                onChange={setVoiceWarmth}
                low="Clinical"
                high="Warm"
              />
              <SliderRow
                label="Formality"
                value={voiceFormality}
                onChange={setVoiceFormality}
                low="Casual"
                high="Formal"
              />
              <SliderRow
                label="Brevity"
                value={voiceBrevity}
                onChange={setVoiceBrevity}
                low="Verbose"
                high="Terse"
              />
            </div>
          </Card>

          {/* AI ROUTING TABLE */}
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1" style={{ color: "var(--color-b-accent-text)" }}>AI routing</div>
            <div className="body-sm mb-6" style={{ color: "var(--color-b-text-tertiary)" }}>
              Which model Butler uses for each task type. Butler picks the fastest, smartest path.
            </div>

            <div className="flex flex-col gap-0">
              <div
                className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-2"
                style={{ borderBottom: "1px solid var(--color-b-border-subtle)" }}
              >
                <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Task</span>
                <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Model</span>
                <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Status</span>
              </div>
              {ROUTING_TABLE.map((row) => (
                <div
                  key={row.task}
                  className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 items-center"
                  style={{ borderBottom: "1px solid var(--color-b-border-subtle)" }}
                >
                  <span className="body-md-med" style={{ color: "var(--color-b-text-primary)" }}>{row.task}</span>
                  <span className="body-sm" style={{ color: "var(--color-b-text-secondary)" }}>{row.model}</span>
                  <Chip tone={row.tone}>{row.status}</Chip>
                </div>
              ))}
            </div>
          </Card>

          {/* LOCATION */}
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-1" style={{ color: "var(--color-b-accent-text)" }}>Location</div>
            <div className="body-sm mb-6" style={{ color: "var(--color-b-text-tertiary)" }}>
              Butler uses your location for weather, travel, and time-aware scheduling. Global by design.
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="type-h4" style={{ color: "var(--color-b-text-primary)" }}>
                  {locationAuto ? "Auto-detect" : "Manual"}
                </div>
                <div className="body-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
                  Currently: Shoreditch, London · 51.5°N, 0.08°W
                </div>
              </div>
              <button
                onClick={() => setLocationAuto(!locationAuto)}
                className="w-12 h-7 rounded-full p-1 transition-colors"
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

            <div
              className="rounded-[10px] p-4"
              style={{ background: "var(--color-b-sunken)" }}
            >
              <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
                Butler never shares your precise coordinates with third parties. Location is used locally for timezone, weather, and travel suggestions only.
              </div>
            </div>
          </Card>

          {/* DANGER ZONE */}
          <Card tone="paper" className="p-6">
            <div className="mono-label mb-4" style={{ color: "var(--color-b-danger)" }}>Danger zone</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="body-md-med" style={{ color: "var(--color-b-text-primary)" }}>Clear all local data</div>
                <div className="body-sm mt-1" style={{ color: "var(--color-b-text-tertiary)" }}>
                  Removes chat history, notes, and preferences from this browser.
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (window.confirm("This will clear all local Butler data. Continue, Boss?")) {
                    localStorage.clear();
                    window.location.reload();
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
  label, value, onChange, low, high,
}: {
  label: string; value: number; onChange: (v: number) => void; low: string; high: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="body-md-med" style={{ color: "var(--color-b-text-primary)" }}>{label}</span>
        <span className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: "var(--color-b-sunken)", accentColor: "var(--color-b-accent)" }}
      />
      <div className="flex justify-between mt-1">
        <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{low}</span>
        <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{high}</span>
      </div>
    </div>
  );
}

type RoutingTone = "accent" | "success" | "neutral";

const ROUTING_TABLE: Array<{
  task: string;
  model: string;
  status: string;
  tone: RoutingTone;
}> = [
  { task: "Writing & replies",  model: "Claude Opus",     status: "active", tone: "accent"  },
  { task: "Research & search",  model: "Gemini Pro",      status: "active", tone: "accent"  },
  { task: "Quick drafts",       model: "GPT-4o",          status: "active", tone: "accent"  },
  { task: "Code review",        model: "Claude Sonnet",   status: "active", tone: "accent"  },
  { task: "Instant answers",    model: "Gemini Flash",    status: "active", tone: "success" },
  { task: "Voice (live)",       model: "Gemini Live",     status: "active", tone: "success" },
  { task: "Image analysis",     model: "Gemini Pro",      status: "idle",   tone: "neutral" },
];
