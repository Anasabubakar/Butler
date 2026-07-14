"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Rail, { type RailKey } from "@/components/Rail";

const PATH_TO_RAIL: Record<string, RailKey> = {
  "/dashboard": "home",
  "/dashboard/chat": "chat",
  "/dashboard/delegation": "delegation",
  "/dashboard/notifications": "notifications",
  "/dashboard/voice": "voice",
  "/dashboard/notes": "notes",
  "/dashboard/integrations": "integrations",
  "/dashboard/settings": "settings",
};

const RAIL_TO_PATH: Record<RailKey, string> = {
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

  if (loading || !user) return null;

  const activeRail = PATH_TO_RAIL[pathname] || "home";

  const handleSelect = (key: RailKey) => {
    router.push(RAIL_TO_PATH[key]);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <Rail active={activeRail} onSelect={handleSelect} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
