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
