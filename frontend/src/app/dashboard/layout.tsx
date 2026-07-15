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
