"use client";

import type { User } from "firebase/auth";
import type { CalendarEvent, GmailMessage, Task, Note, Delegation } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

interface CommandCenterProps {
  user: User | null;
  events: CalendarEvent[];
  tasks: Task[];
  emails: GmailMessage[];
  notes: Note[];
  delegations: Delegation[];
  isLoading: boolean;
  hasWorkspace: boolean;
  onRefresh: () => void;
  onReconnectWorkspace: () => void;
  onOpenChat: () => void;
  onOpenDelegation: () => void;
  onOpenNotifications: () => void;
  onOpenNotes: () => void;
  onOpenIntegrations: () => void;
}

export default function CommandCenter({
  user,
  events,
  tasks,
  emails,
  notes,
  delegations,
  isLoading,
  hasWorkspace,
  onRefresh,
  onReconnectWorkspace,
  onOpenChat,
  onOpenDelegation,
  onOpenNotifications,
  onOpenNotes,
  onOpenIntegrations,
}: CommandCenterProps) {
  const now = new Date();
  const dayLine = now.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const displayName = user?.displayName?.split(" ")[0] || "Boss";
