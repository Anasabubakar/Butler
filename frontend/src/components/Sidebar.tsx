"use client";

import { useAuth } from "@/context/AuthContext";
import ButlerLogo from "./ButlerLogo";

export type SidebarKey =
  | "home"
  | "brief"
  | "chat"
  | "delegation"
  | "notifications"
  | "voice"
  | "notes"
  | "integrations"
  | "settings";

interface NavItem {
  key: SidebarKey;
  label: string;
  badge?: string;
}

const NAV: NavItem[] = [
  { key: "home", label: "Command Center", badge: "CMD·K" },
  { key: "brief", label: "The Brief", badge: "2" },
  { key: "chat", label: "Conversations" },
  { key: "delegation", label: "Delegated Work", badge: "3" },
  { key: "notifications", label: "Notifications", badge: "11" },
  { key: "voice", label: "Voice Room" },
  { key: "notes", label: "Notes & Memory" },
  { key: "integrations", label: "Integrations" },
  { key: "settings", label: "Settings" },
];

const PINNED = [
  { title: "Kai Rivera", meta: "deep collaborator" },
  { title: "Meridian project", meta: "current focus" },
  { title: "Board pack v3", meta: "due Wed" },
];

interface SidebarProps {
  active: SidebarKey;
  onSelect: (key: SidebarKey) => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside
      className="h-full w-[260px] shrink-0 flex flex-col border-r border-b-border-subtle bg-b-sunken"
      aria-label="Dashboard navigation"
    >
      <div className="flex items-center gap-3 px-6 py-7 border-b border-b-border-subtle/60">
        <ButlerLogo size={32} variant="dark" />
        <div className="min-w-0">
          <p className="h-3 truncate">Butler</p>
          <p className="mono-label text-b-text-tertiary mt-0.5">chief of staff</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
        {NAV.map(({ key, label, badge }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] text-left transition-all duration-200 cursor-pointer
                ${isActive ? "bg-b-paper" : "hover:bg-b-paper/60"}`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isActive ? "bg-b-accent" : "bg-b-text-tertiary"
                  }`}
                />
                <span
                  className={`body-md-med truncate ${
                    isActive ? "text-b-text-primary" : "text-b-text-secondary"
                  }`}
                >
                  {label}
                </span>
              </span>
              {badge && (
                <span
                  className={`mono-label px-1.5 py-0.5 rounded-[6px] shrink-0 ${
                    isActive && key === "home"
                      ? "bg-b-accent-soft text-b-accent-text"
                      : "bg-b-paper text-b-text-tertiary"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-5 border-t border-b-border-subtle/60">
        <p className="mono-label text-b-text-tertiary mb-3">Pinned</p>
        <div className="flex flex-col gap-0.5">
          {PINNED.map((item) => (
            <div key={item.title} className="px-3 py-2 rounded-[6px]">
              <p className="body-sm-med text-b-text-primary">{item.title}</p>
              <p className="mono-sm text-b-text-tertiary mt-0.5">{item.meta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-b-border-subtle/60 flex items-center gap-3">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-b-accent-soft flex items-center justify-center">
            <span className="body-sm-med text-b-accent-text">
              {(user?.displayName?.[0] || "B").toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="body-md-med truncate">
            {user?.displayName?.split(" ")[0] || "Boss"}
          </p>
          <p className="mono-label text-b-text-tertiary mt-0.5">acct · London</p>
        </div>
      </div>
    </aside>
  );
}