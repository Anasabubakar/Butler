"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Sidebar, { type SidebarKey } from "@/components/Sidebar";
import Icon from "@/components/Icon";
import QuickNote from "@/components/QuickNote";
import EmailCoverflow from "@/components/EmailCoverflow";
import NotificationCenter from "@/components/NotificationCenter";
import Settings from "@/components/Settings";
import Integrations from "@/components/Integrations";
import type { GmailMessage, Notification } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const PATH_TO_SIDEBAR: Record<string, SidebarKey> = {
  "/dashboard": "home",
  "/dashboard/chat": "home",
  "/dashboard/delegation": "delegation",
  "/dashboard/voice": "voice",
  "/dashboard/notes": "notes",
};

const SIDEBAR_TO_PATH: Record<SidebarKey | "settings", string> = {
  home: "/dashboard",
  delegation: "/dashboard/delegation",
  notes: "/dashboard/notes",
  voice: "/dashboard/voice",
  settings: "/dashboard/settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasWorkspace, signOut, reconnectWorkspace } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Last visited main path tracker
  const [lastMainPath, setLastMainPath] = useState<string>("/dashboard");

  // Drawer overlays state
  const [activeDrawer, setActiveDrawer] = useState<"notifications" | "settings" | "integrations" | null>(null);

  // Saved children state to keep background visible when drawer is open
  const [savedChildren, setSavedChildren] = useState<React.ReactNode>(null);

  // Email coverflow state
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  // Notifications state for top header badge
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 1) Auth redirection
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Keep last main route children saved when we go to a drawer route
  useEffect(() => {
    const isDrawerRoute =
      pathname === "/dashboard/settings" ||
      pathname === "/dashboard/notifications" ||
      pathname === "/dashboard/integrations";
    if (children && !isDrawerRoute) {
      setSavedChildren(children);
    }
  }, [children, pathname]);

  // 2) URL-to-Drawer state synchronization
  useEffect(() => {
    if (pathname === "/dashboard/settings") {
      setActiveDrawer("settings");
    } else if (pathname === "/dashboard/notifications") {
      setActiveDrawer("notifications");
    } else if (pathname === "/dashboard/integrations") {
      setActiveDrawer("integrations");
    } else {
      setActiveDrawer(null);
      setLastMainPath(pathname);
    }
  }, [pathname]);

  // 3) Fetch coverflow emails
  const fetchEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      let brief;
      try {
        const sync = await api.workspace.sync();
        brief = sync.brief;
      } catch {
        brief = await api.workspace.brief();
      }
      if (brief && Array.isArray(brief.emails)) {
        setEmails(brief.emails);
      }
    } catch (err) {
      console.error("Failed to fetch coverflow emails:", err);
    } finally {
      setIsLoadingEmails(false);
    }
  }, []);

  // 4) Fetch notifications for badges
  const fetchNotifications = useCallback(async () => {
    try {
      const list = await api.notifications.list();
      setNotifications(list);
    } catch (err) {
      console.error("Failed to fetch layout notifications:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void fetchNotifications();
      // Poll notifications every 30s for updates
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (hasWorkspace && user) {
      void fetchEmails();
    }
  }, [hasWorkspace, user, fetchEmails]);

  // Refresh notifications when drawer closes to sync read states
  useEffect(() => {
    if (!activeDrawer && user) {
      void fetchNotifications();
    }
  }, [activeDrawer, user, fetchNotifications]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-b-canvas">
        <div className="flex flex-col items-center gap-3">
          <p className="mono-label text-b-text-tertiary animate-pulse">Loading Butler…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const active = PATH_TO_SIDEBAR[pathname] || "home";
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const handleSelectNav = (key: SidebarKey | "settings") => {
    if (key === "settings") {
      router.push("/dashboard/settings");
    } else {
      router.push(SIDEBAR_TO_PATH[key]);
    }
  };

  const handleCloseDrawer = () => {
    router.push(lastMainPath);
  };

  const getPageTitle = () => {
    switch (active) {
      case "home":
        return "Home";
      case "delegation":
        return "Delegated Work";
      case "notes":
        return "Notes & Memory";
      case "voice":
        return "Voice Room";
      default:
        return "Home";
    }
  };

  const isDrawerRoute =
    pathname === "/dashboard/settings" ||
    pathname === "/dashboard/notifications" ||
    pathname === "/dashboard/integrations";

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-b-canvas text-b-text-primary">
      {/* Sidebar Rail Navigation (80px) */}
      <Sidebar active={active} onSelect={handleSelectNav} />

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-[72px] shrink-0 border-b border-b-border-subtle flex items-center justify-between px-10 bg-b-paper">
          <div className="flex flex-col">
            <h1 className="type-h3 text-b-text-primary">{getPageTitle()}</h1>
            <p className="mono-sm text-b-text-tertiary mt-0.5">chief of staff workspace</p>
          </div>

          {/* Top Right Utilities */}
          <div className="flex items-center gap-4">
            {/* Notifications Button */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/notifications")}
              className="relative w-10 h-10 rounded-full border border-b-border-subtle bg-b-paper flex items-center justify-center hover:bg-b-sunken transition-colors cursor-pointer"
              aria-label="Open notifications"
            >
              <Icon name="bell" size={20} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-b-accent text-b-text-on-accent text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Integrations Button */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/integrations")}
              className="w-10 h-10 rounded-full border border-b-border-subtle bg-b-paper flex items-center justify-center hover:bg-b-sunken transition-colors cursor-pointer"
              aria-label="Open integrations"
            >
              <Icon name="link" size={20} />
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/settings")}
              className="w-10 h-10 rounded-full border border-b-border-subtle bg-b-paper flex items-center justify-center hover:bg-b-sunken transition-colors cursor-pointer"
              aria-label="Open settings"
            >
              <Icon name="settings" size={20} />
            </button>
          </div>
        </header>

        {/* Left Column (Children Page Workspace) & Right Column Grid */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main workspace section */}
          <main className="flex-1 min-w-0 h-full overflow-hidden relative">
            {isDrawerRoute ? savedChildren : children}
          </main>

          {/* Right Column Supporting Context (400px) */}
          <aside className="w-[400px] shrink-0 border-l border-b-border-subtle bg-b-sunken h-full flex flex-col p-6 gap-6 overflow-y-auto select-none">
            {/* Quick Note capture */}
            <QuickNote />

            {/* Recent Emails Coverflow */}
            <div className="flex-1 flex flex-col justify-start">
              <EmailCoverflow
                emails={emails}
                hasWorkspace={hasWorkspace}
                isLoading={isLoadingEmails}
                onOpenNotifications={() => router.push("/dashboard/notifications")}
                onDraftQueued={() => {
                  router.push("/dashboard/delegation");
                }}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Drawer slide-over panels overlay */}
      <AnimatePresence>
        {activeDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="fixed inset-0 bg-b-ink/20 backdrop-blur-xs z-40 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 350 }}
              className="fixed top-0 right-0 h-full w-[600px] bg-b-paper border-l border-b-border-subtle shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="h-[72px] flex items-center justify-between px-8 border-b border-b-border-subtle bg-b-sunken shrink-0 select-none">
                <div>
                  <span className="mono-label text-b-accent-text">Control Center</span>
                  <h3 className="type-h4 mt-0.5 text-b-text-primary capitalize">
                    {activeDrawer}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="w-9 h-9 rounded-full border border-b-border-default flex items-center justify-center text-[20px] font-light hover:bg-b-sunken cursor-pointer transition-colors"
                  aria-label="Close drawer"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 bg-b-canvas">
                {activeDrawer === "notifications" && <NotificationCenter />}
                {activeDrawer === "settings" && (
                  <Settings
                    user={user}
                    hasWorkspace={hasWorkspace}
                    onSignOut={signOut}
                    onReconnectWorkspace={reconnectWorkspace}
                  />
                )}
                {activeDrawer === "integrations" && (
                  <Integrations
                    hasWorkspace={hasWorkspace}
                    onConnectWorkspace={reconnectWorkspace}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
