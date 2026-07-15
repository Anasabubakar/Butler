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
  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;
  const awaiting = delegations.filter((d) => d.status === "awaiting");
  const needsCount = emails.length + pendingTasks + awaiting.length;

  const freeHours = estimateDeepWork(events);
  const greeting = greetingForHour(now.getHours());

  return (
    <div className="w-full h-full overflow-y-auto bg-b-canvas">
      <div className="h-16 flex items-center justify-between px-8 border-b border-b-border-subtle">
        <div className="body-sm text-b-text-tertiary">
          Command Center · {dayLine}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] w-[min(100%,340px)] bg-b-paper border border-b-border-subtle">
          <span className="body-md text-b-text-tertiary" aria-hidden>
            ⌕
          </span>
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 text-left body-sm text-b-text-tertiary"
          >
            Ask Butler anything
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="mono-label shrink-0 text-b-accent-text disabled:opacity-50"
            disabled={isLoading}
            aria-label="Refresh workspace data"
          >
            {isLoading ? "···" : "↻"}
          </button>
        </div>
      </div>

      <div className="px-8 pt-8 pb-4">
        <h1 className="display-m text-b-text-primary">
          {greeting},{" "}
          <em className="display-italic" style={{ fontStyle: "italic" }}>
            {displayName}.
          </em>
        </h1>
        <p className="body-lg mt-3 text-b-text-secondary">
          {!hasWorkspace
            ? "Connect Google Workspace to load your calendar, mail, and tasks."
            : needsCount > 0
            ? `${needsCount} thing${needsCount === 1 ? "" : "s"} need you today. I've held the rest.`
            : "Your day looks calm. I'm watching the inbox and calendar."}
