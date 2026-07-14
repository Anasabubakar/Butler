import React from "react";
import ButlerLogo from "./ButlerLogo";

export type RailKey = "home" | "brief" | "chat" | "delegation" | "notifications" | "voice" | "notes" | "integrations" | "settings";

interface RailItem { key: RailKey; label: string; caption: string; }

// From Figma: the rail uses these 2-letter monospace codes
const RAIL: RailItem[] = [
  { key: "home",          label: "CC", caption: "Command Center" },
  { key: "brief",         label: "BR", caption: "The Brief" },
  { key: "chat",          label: "CV", caption: "Conversations" },
  { key: "delegation",    label: "DW", caption: "Delegated Work" },
  { key: "notifications", label: "NT", caption: "Notifications" },
  { key: "voice",         label: "VC", caption: "Voice Room" },
  { key: "notes",         label: "NO", caption: "Notes & Memory" },
  { key: "integrations",  label: "IN", caption: "Integrations" },
  { key: "settings",      label: "ST", caption: "Settings" },
];

interface RailProps {
  active: RailKey;
  onSelect: (key: RailKey) => void;
}

export default function Rail({ active, onSelect }: RailProps) {
  return (
    <aside
      id="butler-rail"
      className="w-[72px] h-full flex-shrink-0 border-r flex flex-col items-center"
      style={{
        background: "var(--color-b-sunken)",
        borderColor: "var(--color-b-border-subtle)",
      }}
    >
      <button
        onClick={() => onSelect("home")}
        aria-label="Butler home"
        className="mt-5 mb-4 rounded-lg transition-opacity hover:opacity-90"
      >
        <ButlerLogo size={36} variant="dark" />
      </button>

      <nav className="flex-1 flex flex-col items-center gap-2 pt-2" aria-label="Primary navigation">
        {RAIL.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              aria-label={it.caption}
              aria-current={isActive ? "page" : undefined}
              title={it.caption}
              className="group relative w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200"
              style={{
                background: isActive ? "var(--color-b-paper)" : "transparent",
                border: `1px solid ${isActive ? "var(--color-b-border-default)" : "transparent"}`,
                color: isActive ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)",
              }}
            >
              <span className="mono-label">{it.label}</span>
              {/* Tooltip */}
              <span
                className="pointer-events-none absolute left-full ml-3 whitespace-nowrap px-2 py-1 rounded-md mono-label opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "var(--color-b-ink)",
                  color: "var(--color-b-text-inverse)",
                  zIndex: 40,
                }}
              >
                {it.caption}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
