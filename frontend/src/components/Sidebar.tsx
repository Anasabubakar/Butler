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

