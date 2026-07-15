"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar, { type SidebarKey } from "@/components/Sidebar";
import ButlerLogo from "@/components/ButlerLogo";

const PATH_TO_SIDEBAR: Record<string, SidebarKey> = {
  "/dashboard": "home",
  "/dashboard/chat": "chat",
  "/dashboard/delegation": "delegation",
  "/dashboard/notifications": "notifications",
  "/dashboard/voice": "voice",
  "/dashboard/notes": "notes",
  "/dashboard/integrations": "integrations",
  "/dashboard/settings": "settings",
};

const SIDEBAR_TO_PATH: Record<SidebarKey, string> = {
  home: "/dashboard",
  brief: "/dashboard",
  chat: "/dashboard/chat",
  delegation: "/dashboard/delegation",
  notifications: "/dashboard/notifications",
  voice: "/dashboard/voice",
  notes: "/dashboard/notes",
  integrations: "/dashboard/integrations",
  settings: "/dashboard/settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
