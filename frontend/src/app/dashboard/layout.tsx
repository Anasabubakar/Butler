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
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-b-canvas">
        <div className="flex flex-col items-center gap-3">
          <ButlerLogo size={40} variant="dark" />
          <p className="mono-label text-b-text-tertiary animate-pulse">Loading Butler…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const active = PATH_TO_SIDEBAR[pathname] || "home";

  return (
    <div className="h-screen flex overflow-hidden bg-b-canvas">
      <Sidebar
        active={active}
        onSelect={(key) => router.push(SIDEBAR_TO_PATH[key])}
      />
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
