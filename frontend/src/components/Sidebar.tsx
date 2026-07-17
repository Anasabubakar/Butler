"use client";

import { useAuth } from "@/context/AuthContext";
import ButlerLogo from "./ButlerLogo";
import Icon, { type IconName } from "./Icon";

export type SidebarKey =
  | "home"
  | "delegation"
  | "notes"
  | "voice";

interface NavItem {
  key: SidebarKey;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { key: "home", label: "Conversations", icon: "home" },
  { key: "delegation", label: "Delegated Work", icon: "clipboard" },
  { key: "notes", label: "Notes & Memory", icon: "book" },
  { key: "voice", label: "Voice Room", icon: "mic" },
];

interface SidebarProps {
  active: SidebarKey;
  onSelect: (key: SidebarKey | "settings") => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside
      className="h-full w-20 shrink-0 flex flex-col items-center justify-between py-6 border-r border-b-border-subtle bg-b-sunken"
      aria-label="Dashboard navigation"
    >
      {/* Top logo */}
      <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => onSelect("home")}>
        <ButlerLogo size={28} variant="dark" />
        <span className="mono-label text-[8px] tracking-[0.15em] text-b-text-tertiary">Butler</span>
      </div>

      {/* Navigation center */}
      <nav className="flex flex-col gap-3 w-full px-3">
        {NAV.map(({ key, label, icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative w-14 h-14 rounded-[12px] flex items-center justify-center transition-all duration-200 cursor-pointer
                ${isActive ? "bg-b-paper text-b-accent border border-b-border-subtle shadow-sm" : "text-b-text-secondary hover:bg-b-paper/50 hover:text-b-text-primary"}`}
            >
              <Icon name={icon} size={22} animate={isActive} />
              
              {/* Tooltip */}
              <div className="absolute left-20 scale-0 group-hover:scale-100 transition-transform origin-left bg-b-ink text-b-text-inverse text-[11px] font-medium tracking-[0.02em] px-2.5 py-1.5 rounded-[6px] shadow-md whitespace-nowrap z-50 pointer-events-none">
                {label}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Profile avatar at the bottom */}
      <button
        type="button"
        onClick={() => onSelect("settings")}
        className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-b-accent"
        aria-label="Open Settings"
      >
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt="Profile Settings"
            className="w-10 h-10 rounded-full object-cover border border-b-border-default hover:border-b-accent transition-colors"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-b-accent-soft flex items-center justify-center border border-b-border-default hover:border-b-accent transition-colors">
            <span className="body-sm-med text-b-accent-text">
              {(user?.displayName?.[0] || "B").toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Tooltip */}
        <div className="absolute left-16 bottom-0 scale-0 group-hover:scale-100 transition-transform origin-left bg-b-ink text-b-text-inverse text-[11px] font-medium px-2.5 py-1.5 rounded-[6px] shadow-md whitespace-nowrap z-50 pointer-events-none">
          Settings & Profile
        </div>
      </button>
    </aside>
  );
}
