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
          {isLoading && (
            <span className="ml-2 mono-label text-b-accent-text">syncing…</span>
          )}
        </p>
        {!hasWorkspace && (
          <div className="mt-4">
            <Button variant="accent" size="md" onClick={onReconnectWorkspace}>
              Connect Google Workspace
            </Button>
          </div>
        )}
      </div>

      <div className="px-8 pb-10">
        <div className="grid grid-cols-12 gap-5">
          <Card
            tone="ink"
            bordered={false}
            className="col-span-12 xl:col-span-7 p-6 flex flex-col justify-between min-h-[300px]"
          >
            <div>
              <div className="mono-label mb-3 text-b-accent-text">
                The Brief · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <h2 className="type-h2 mb-3 text-b-text-inverse">
                {needsCount > 0
                  ? "Here's what matters before your next move."
                  : "Quiet morning — nothing urgent on the desk."}
              </h2>
              <div className="body-md whitespace-pre-line text-b-text-tertiary">
                {briefFromData(emails, tasks, events, awaiting)}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6 flex-wrap">
              {awaiting.length > 0 ? (
                <Button variant="accent" size="md" onClick={onOpenDelegation}>
                  Review {awaiting.length} approval{awaiting.length === 1 ? "" : "s"}
                </Button>
              ) : (
                <Button variant="accent" size="md" onClick={onOpenChat}>
                  Talk to Butler
                </Button>
              )}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="body-sm-med text-b-text-tertiary"
              >
                Open notifications desk
              </button>
            </div>
          </Card>

          <Card tone="raised" className="col-span-6 xl:col-span-2 p-5 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="mono-label mb-2 text-b-text-tertiary">Deep work</div>
              <div className="type-h1 text-b-text-primary">{freeHours.label}</div>
              <div className="body-sm mt-1 text-b-text-secondary">
                {hasWorkspace ? "open on calendar" : "connect calendar"}
              </div>
            </div>
            <div className="h-1.5 rounded-full mt-4 bg-b-sunken">
              <div
                className="h-full rounded-full bg-b-accent transition-all"
                style={{ width: `${freeHours.pct}%` }}
              />
            </div>
          </Card>

          <Card tone="raised" className="col-span-6 xl:col-span-3 p-5 min-h-[140px]">
            <div className="mono-label mb-2 text-b-text-tertiary">Next up</div>
            <div className="type-h4 text-b-text-primary">
              {events[0]?.summary || (hasWorkspace ? "Nothing scheduled" : "Calendar offline")}
            </div>
            <div className="body-sm mt-2 whitespace-pre-line text-b-text-secondary">
              {formatNextEvent(events)}
            </div>
          </Card>

          <Card tone="raised" className="col-span-6 xl:col-span-2 p-5 min-h-[140px]">
            <div className="mono-label mb-2 text-b-text-tertiary">Tasks open</div>
            <div className="type-h1 text-b-text-primary">{pendingTasks}</div>
            <div className="body-sm mt-2 text-b-text-secondary">
              {hasWorkspace ? "from Google Tasks" : "connect Workspace"}
            </div>
          </Card>

          <Card tone="raised" className="col-span-6 xl:col-span-3 p-5 min-h-[140px]">
            <div className="mono-label mb-3 text-b-text-tertiary">AI · today</div>
            <div className="flex flex-col gap-1.5">
              <RouterRow model="Flash" task="fast answers" />
              <RouterRow model="Pro" task="writing & analysis" />
              <RouterRow model="Live" task="voice room" />
            </div>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-5 p-6 min-h-[320px]">
            <div className="mono-label mb-2 text-b-text-tertiary">
              Agenda · {now.toLocaleDateString([], { weekday: "short" })}
