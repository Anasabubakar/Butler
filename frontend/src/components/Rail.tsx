"use client";

export type RailKey =
  | "home"
  | "brief"
  | "chat"
  | "delegation"
  | "notifications"
  | "voice"
  | "notes"
  | "integrations"
  | "settings";

interface RailProps {
  active: RailKey;
  onSelect: (key: RailKey) => void;
}

const ITEMS: { key: RailKey; code: string }[] = [
  { key: "home", code: "Hm" },
  { key: "brief", code: "Br" },
  { key: "chat", code: "Ch" },
  { key: "delegation", code: "Dl" },
  { key: "notifications", code: "Nt" },
  { key: "voice", code: "Vc" },
  { key: "notes", code: "No" },
  { key: "integrations", code: "In" },
  { key: "settings", code: "St" },
];

export default function Rail({ active, onSelect }: RailProps) {
  return (
    <nav
      className="h-full flex flex-col items-center py-4 gap-1 border-r border-b-border-subtle"
      style={{ width: 72, background: "var(--color-b-paper)" }}
    >
      <img
        src="/images/logo-dark-nobg.svg"
        alt="Butler"
        className="mb-4"
        style={{ height: 32, width: "auto" }}
      />

      {ITEMS.map(({ key, code }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-11 h-11 rounded-[10px] flex items-center justify-center font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-all duration-200 cursor-pointer
              ${isActive
                ? "bg-b-ink text-b-text-inverse"
                : "text-b-text-tertiary hover:bg-b-sunken hover:text-b-text-primary"
              }`}
          >
            {code}
          </button>
        );
      })}
    </nav>
  );
}
