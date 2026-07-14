"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { UserSettings } from "@/types";
import Card from "./Card";
import Button from "./Button";

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    warmth: 72,
    formality: 55,
    brevity: 80,
    locationAutoDetect: true,
    locationText: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(() => {});
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.settings.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }, [settings]);

  const updateField = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="max-w-xl mx-auto px-6 py-8">
        <h2 className="heading-lg mb-6">Settings</h2>

        <Card tone="raised" className="p-5 mb-4">
          <h3 className="heading-sm mb-4">Butler Personality</h3>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="body-sm text-b-text-primary">Warmth</label>
                <span className="mono-label text-b-text-tertiary">{settings.warmth}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.warmth}
                onChange={(e) => updateField("warmth", Number(e.target.value))}
                className="w-full accent-b-accent"
              />
              <div className="flex justify-between body-xs text-b-text-tertiary mt-0.5">
                <span>Professional</span>
                <span>Warm</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="body-sm text-b-text-primary">Formality</label>
                <span className="mono-label text-b-text-tertiary">{settings.formality}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.formality}
                onChange={(e) => updateField("formality", Number(e.target.value))}
                className="w-full accent-b-accent"
              />
              <div className="flex justify-between body-xs text-b-text-tertiary mt-0.5">
                <span>Casual</span>
                <span>Formal</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="body-sm text-b-text-primary">Brevity</label>
                <span className="mono-label text-b-text-tertiary">{settings.brevity}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.brevity}
                onChange={(e) => updateField("brevity", Number(e.target.value))}
                className="w-full accent-b-accent"
              />
              <div className="flex justify-between body-xs text-b-text-tertiary mt-0.5">
                <span>Detailed</span>
                <span>Concise</span>
              </div>
            </div>
          </div>
        </Card>

        <Card tone="raised" className="p-5 mb-4">
          <h3 className="heading-sm mb-4">Location</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="body-sm text-b-text-primary flex-1">
              Auto-detect location
            </label>
            <button
              onClick={() =>
                updateField("locationAutoDetect", !settings.locationAutoDetect)
              }
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
                settings.locationAutoDetect ? "bg-b-accent" : "bg-b-border-default"
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.locationAutoDetect ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {!settings.locationAutoDetect && (
            <input
              value={settings.locationText}
              onChange={(e) => updateField("locationText", e.target.value)}
              placeholder="Enter your location"
              className="w-full bg-b-sunken rounded-[10px] px-4 py-2 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent"
            />
          )}
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="accent" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {saved && (
            <span className="body-sm text-b-success">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
