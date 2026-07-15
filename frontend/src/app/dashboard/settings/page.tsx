"use client";

import { useAuth } from "@/context/AuthContext";
import Settings from "@/components/Settings";

export default function SettingsPage() {
  const { user, signOut, hasWorkspace, reconnectWorkspace } = useAuth();
  return (
