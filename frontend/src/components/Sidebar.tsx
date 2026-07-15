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
  { key: "home", label: "Command Center" },
  { key: "chat", label: "Conversations" },
  { key: "delegation", label: "Delegated Work" },
  { key: "notifications", label: "Notifications" },
  { key: "voice", label: "Voice Room" },
  { key: "notes", label: "Notes & Memory" },
  { key: "integrations", label: "Integrations" },
  { key: "settings", label: "Settings" },
];

interface SidebarProps {
  active: SidebarKey;
  onSelect: (key: SidebarKey) => void;
  badges?: Partial<Record<SidebarKey, string>>;
}

export default function Sidebar({ active, onSelect, badges }: SidebarProps) {
  const { user, hasWorkspace } = useAuth();

  return (
    <aside
      className="h-full w-[260px] shrink-0 flex flex-col border-r border-b-border-subtle bg-b-sunken"
      aria-label="Dashboard navigation"
    >
      <div className="flex items-center gap-3 px-6 py-7 border-b border-b-border-subtle/60">
        <ButlerLogo size={32} variant="dark" />
        <div className="min-w-0">
          <p className="type-h3 truncate">Butler</p>
          <p className="mono-label text-b-text-tertiary mt-0.5">chief of staff</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5">
        {NAV.map(({ key, label, badge }) => {
          const isActive = active === key || (key === "home" && active === "brief");
          const liveBadge = badges?.[key] ?? badge;
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
              {liveBadge && (
                <span
                  className={`mono-label px-1.5 py-0.5 rounded-[6px] shrink-0 ${
                    isActive
                      ? "bg-b-accent-soft text-b-accent-text"
                      : "bg-b-paper text-b-text-tertiary"
                  }`}
                >
                  {liveBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-b-border-subtle/60 flex items-center gap-3">
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
