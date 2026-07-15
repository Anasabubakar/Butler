"use client";

import type { User } from "firebase/auth";
import type { CalendarEvent, GmailMessage, Task, Note } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

interface CommandCenterProps {
  user: User | null;
  events: CalendarEvent[];
  tasks: Task[];
  emails: GmailMessage[];
  notes: Note[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenChat: () => void;
  onOpenDelegation: () => void;
  onOpenNotifications: () => void;
  onOpenNotes: () => void;
}

export default function CommandCenter({
  events,
  tasks,
  emails,
  notes,
  isLoading,
  onRefresh,
  onOpenChat,
  onOpenDelegation,
  onOpenNotifications,
  onOpenNotes,
}: CommandCenterProps) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="display-sm">
              {greeting()}, Boss
            </h1>
            <p className="body-md text-b-text-secondary mt-1">
              Here&apos;s your command center overview.
            </p>
          </div>
          <Button variant="ghost" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Chat", action: onOpenChat, tone: "accent" as const },
            { label: "Delegate", action: onOpenDelegation, tone: "success" as const },
            { label: "Notifications", action: onOpenNotifications, tone: "warning" as const },
            { label: "Notes", action: onOpenNotes, tone: "info" as const },
          ].map((q) => (
            <Card
              key={q.label}
              tone="raised"
              radius="lg"
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={q.action}
            >
              <Chip tone={q.tone} variant="soft">{q.label}</Chip>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Calendar */}
          <Card tone="raised" className="p-5">
            <h3 className="heading-sm mb-3">Today&apos;s Schedule</h3>
            {events.length === 0 ? (
              <p className="body-sm text-b-text-tertiary">No events today.</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-2 rounded-[8px] bg-b-sunken"
                  >
                    <span className="body-xs text-b-accent-text font-mono whitespace-nowrap">
                      {e.start
                        ? new Date(e.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "All day"}
                    </span>
                    <span className="body-sm truncate">{e.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tasks */}
          <Card tone="raised" className="p-5">
            <h3 className="heading-sm mb-3">Tasks</h3>
            {tasks.length === 0 ? (
              <p className="body-sm text-b-text-tertiary">No pending tasks.</p>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-2 rounded-[8px] bg-b-sunken"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                        t.status === "completed"
                          ? "bg-b-success border-b-success"
                          : "border-b-border-default"
                      }`}
                    />
                    <span
                      className={`body-sm truncate ${
                        t.status === "completed"
                          ? "line-through text-b-text-tertiary"
                          : ""
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Email */}
          <Card tone="raised" className="p-5">
            <h3 className="heading-sm mb-3">Inbox</h3>
            {emails.length === 0 ? (
              <p className="body-sm text-b-text-tertiary">Inbox is empty.</p>
            ) : (
              <div className="space-y-2">
                {emails.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-[8px] bg-b-sunken"
                  >
                    <div className="flex justify-between items-baseline">
                      <span className="body-xs font-medium truncate flex-1">
                        {m.from}
                      </span>
                      <span className="body-xs text-b-text-tertiary ml-2 whitespace-nowrap">
                        {new Date(m.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="body-xs truncate text-b-text-secondary">
                      {m.subject}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card tone="raised" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="heading-sm">Notes</h3>
              <Chip tone="neutral" variant="soft">{notes.length}</Chip>
            </div>
            {notes.length === 0 ? (
              <p className="body-sm text-b-text-tertiary">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 p-2 rounded-[8px] bg-b-sunken"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: n.color || "#F5EFE6" }}
                    />
                    <span className="body-sm truncate">{n.title}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
