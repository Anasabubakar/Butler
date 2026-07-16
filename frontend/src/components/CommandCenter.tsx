"use client";

import type { User } from "firebase/auth";
import type { CalendarEvent, GmailMessage, Task, Note, Delegation } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

interface CommandCenterProps {
  user: User | null;
  events: CalendarEvent[];
  weekEvents?: CalendarEvent[];
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
  onCompleteTask?: (id: string) => void;
  onAddTask?: (title: string) => void;
}

export default function CommandCenter({
  user,
  events,
  weekEvents = [],
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
  onCompleteTask,
  onAddTask,
}: CommandCenterProps) {
  const now = new Date();
  const dayLine = now.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const displayName = user?.displayName?.split(" ")[0] || "Boss";
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const pendingTasks = openTasks.length;
  const awaiting = delegations.filter((d) => d.status === "awaiting");
  const needsCount = emails.length + pendingTasks + awaiting.length;

  const freeHours = estimateDeepWork(events);
  const greeting = pickGreeting(now, displayName);
  const weekOnly = weekEvents.filter((e) => !isTodayEvent(e));

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
          {greeting.line}
          {greeting.includeName && (
            <>
              {" "}
              <em className="display-italic" style={{ fontStyle: "italic" }}>
                {displayName}.
              </em>
            </>
          )}
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
              Agenda · Today only
            </div>
            <h3 className="type-h3 mb-4 text-b-text-primary">Held for you.</h3>
            <div className="flex flex-col gap-2.5">
              {events.length === 0 && !isLoading && (
                <div className="body-sm text-b-text-tertiary">
                  {hasWorkspace
                    ? "No events today. I'm keeping the day quiet."
                    : "Connect Google Calendar to see today's agenda."}
                </div>
              )}
              {events.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="grid grid-cols-[72px_1fr_auto] gap-3 items-baseline"
                >
                  <span className="mono-sm text-b-accent-text">
                    {formatEventTime(ev.start)}
                  </span>
                  <span className="body-md-med truncate text-b-text-primary">
                    {ev.summary}
                  </span>
                  <span className="body-sm truncate max-w-[180px] text-b-text-tertiary">
                    {ev.location ? `· ${ev.location}` : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-b-border-subtle">
              <div className="mono-label mb-3 text-b-text-tertiary">This week</div>
              <div className="flex flex-col gap-2">
                {weekOnly.length === 0 && !isLoading && (
                  <div className="body-sm text-b-text-tertiary">
                    {hasWorkspace ? "Nothing else scheduled this week." : "—"}
                  </div>
                )}
                {weekOnly.slice(0, 4).map((ev) => (
                  <div
                    key={`w-${ev.id}`}
                    className="grid grid-cols-[88px_1fr] gap-3 items-baseline"
                  >
                    <span className="mono-sm text-b-text-tertiary">
                      {formatWeekDay(ev.start)}
                    </span>
                    <span className="body-sm truncate text-b-text-primary">
                      {formatEventTime(ev.start)} · {ev.summary}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-3 p-6 min-h-[320px]">
            <div className="mono-label mb-2 text-b-accent-text">
              Inbox · {emails.length}
            </div>
            <h3 className="type-h3 mb-4 text-b-text-primary">Recent mail.</h3>
            <div className="flex flex-col gap-2.5">
              {emails.length === 0 && !isLoading && (
                <div className="body-sm text-b-text-tertiary">
                  {hasWorkspace ? "Your inbox is quiet, Boss." : "Connect Gmail to load messages."}
                </div>
              )}
              {emails.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="body-sm-med truncate text-b-text-primary">{m.from}</div>
                    <div className="body-sm truncate text-b-text-tertiary">{m.subject}</div>
                  </div>
                  <Chip tone="neutral">open</Chip>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenNotifications}
              className="body-sm-med mt-4 text-b-accent-text"
            >
              Open notifications desk →
            </button>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[320px]">
            <div className="mono-label mb-2 text-b-text-tertiary">
              Delegated · {awaiting.length} pending
            </div>
            <h3 className="type-h3 mb-4 text-b-text-primary">Awaiting you.</h3>
            <div className="flex flex-col gap-4">
              {awaiting.length === 0 && (
                <p className="body-sm text-b-text-tertiary">
                  No drafts waiting. Create one from Delegated Work or ask Butler.
                </p>
              )}
              {awaiting.slice(0, 3).map((d) => (
                <div key={d.id}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                    <span className="mono-label shrink-0 text-b-accent-text">
                      {d.service}
                    </span>
                    {d.context && (
                      <span className="mono-label min-w-0 text-b-text-tertiary">
                        · {d.context}
                      </span>
                    )}
                  </div>
                  <div className="body-sm-med leading-snug text-b-text-primary">{d.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="primary" onClick={onOpenDelegation}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="mono-label mb-2 text-b-text-tertiary">Memory · recent</div>
            <h3 className="type-h4 mb-4 text-b-text-primary">What Butler remembers.</h3>
            <div className="flex flex-col gap-2.5">
              {notes.length === 0 && (
                <p className="body-sm text-b-text-tertiary">
                  No memories yet. Add notes so Butler can stay consistent.
                </p>
              )}
              {notes.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 min-w-0">
                  <span className="body-sm flex-1 min-w-0 leading-snug text-b-text-primary">
                    · {n.title || n.content?.slice(0, 60)}
                  </span>
                  <span className="mono-sm shrink-0 pt-0.5 text-b-text-tertiary">
                    {formatAgo(n.updatedAt)}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenNotes}
              className="body-sm-med mt-4 text-b-accent-text"
            >
              Open memory →
            </button>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="mono-label mb-2 text-b-text-tertiary">Integrations</div>
            <h3 className="type-h4 mb-4 text-b-text-primary">The household.</h3>
            <div className="flex flex-col gap-3">
              <IntegrationRow
                name="Google Workspace"
                state={hasWorkspace ? "connected" : "available"}
              />
              <IntegrationRow name="GitHub" state="soon" />
              <IntegrationRow name="Slack" state="soon" />
              <IntegrationRow name="Notion" state="soon" />
            </div>
            <button
              type="button"
              onClick={onOpenIntegrations}
              className="body-sm-med mt-4 text-b-accent-text"
            >
              Manage integrations →
            </button>
          </Card>

          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="flex items-center justify-between mb-2">
              <div className="mono-label text-b-text-tertiary">Open tasks · Google</div>
              {onAddTask && hasWorkspace && (
                <button
                  type="button"
                  className="mono-label text-b-accent-text hover:underline cursor-pointer"
                  onClick={() => {
                    const title = window.prompt("New task title");
                    if (title?.trim()) onAddTask(title.trim());
                  }}
                >
                  + Add
                </button>
              )}
            </div>
            <h3 className="type-h4 mb-4 text-b-text-primary">Still on the list.</h3>
            <div className="flex flex-col gap-2.5">
              {openTasks.length === 0 && (
                <p className="body-sm text-b-text-tertiary">
                  {hasWorkspace ? "No open tasks." : "Connect Tasks to load your list."}
                </p>
              )}
              {openTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-start gap-2.5 group">
                  <button
                    type="button"
                    aria-label={`Mark ${t.title} done`}
                    disabled={!onCompleteTask}
                    onClick={() => onCompleteTask?.(t.id)}
                    className="mt-0.5 w-4 h-4 rounded-[4px] border border-b-border-default shrink-0 hover:border-b-accent hover:bg-b-accent-soft transition-colors cursor-pointer disabled:cursor-default"
                  />
                  <span className="body-sm text-b-text-primary leading-snug">{t.title}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RouterRow({ model, task }: { model: string; task: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="body-sm-med w-16 text-b-text-primary">{model}</span>
      <span className="body-sm text-b-text-tertiary">{task}</span>
    </div>
  );
}

function IntegrationRow({
  name,
  state,
}: {
  name: string;
  state: "connected" | "available" | "soon";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="body-sm-med text-b-text-primary">{name}</span>
      <span
        className={`mono-label ${
          state === "connected"
            ? "text-b-success"
            : state === "available"
            ? "text-b-warning"
            : "text-b-text-tertiary"
        }`}
      >
        {state === "connected" ? "live" : state === "available" ? "connect" : "soon"}
      </span>
    </div>
  );
}

/** Five named greeting states — rotates by time-of-day + weekday, always can include name. */
function pickGreeting(now: Date, name: string): { line: string; includeName: boolean; state: string } {
  const h = now.getHours();
  const day = now.getDay(); // 0 Sun
  const states: Array<{ state: string; line: string; includeName: boolean; when: () => boolean }> = [
    {
      state: "dawn",
      line: "Up early",
      includeName: true,
      when: () => h >= 5 && h < 8,
    },
    {
      state: "morning",
      line: "Good morning",
      includeName: true,
      when: () => h >= 8 && h < 12,
    },
    {
      state: "afternoon",
      line: "Good afternoon",
      includeName: true,
      when: () => h >= 12 && h < 17,
    },
    {
      state: "evening",
      line: "Good evening",
      includeName: true,
      when: () => h >= 17 && h < 21,
    },
    {
      state: "night",
      line: "Still at it",
      includeName: true,
      when: () => h >= 21 || h < 5,
    },
  ];
  // Weekend flavour: swap afternoon line
  if ((day === 0 || day === 6) && h >= 10 && h < 16) {
    return { state: "weekend", line: "Easy day", includeName: true };
  }
  const hit = states.find((s) => s.when());
  if (hit) return { state: hit.state, line: hit.line, includeName: hit.includeName };
  return { state: "default", line: `Hello`, includeName: true };
}

function isTodayEvent(ev: CalendarEvent) {
  const start = ev.start || "";
  const now = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const today = now.toISOString().slice(0, 10);
    return start === today;
  }
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatWeekDay(start: string) {
  if (!start) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const d = new Date(start + "T12:00:00");
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return start.slice(0, 10);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function briefFromData(
  emails: GmailMessage[],
  tasks: Task[],
  events: CalendarEvent[],
  awaiting: Delegation[]
) {
  const bullets: string[] = [];
  if (awaiting.length) {
    bullets.push(
      `· ${awaiting.length} draft${awaiting.length === 1 ? "" : "s"} await your approval in Delegated Work.`
    );
  }
  if (emails.length) {
    const first = emails[0];
    bullets.push(
      `· ${first.from}'s message on "${truncate(first.subject, 40)}" is in the inbox.`
    );
  }
  if (events.length > 0) {
    bullets.push(
      `· Next: ${formatEventTime(events[0].start)} — ${truncate(events[0].summary, 48)}.`
    );
  }
  const pending = tasks.filter((t) => t.status !== "completed").slice(0, 1);
  if (pending.length) {
    bullets.push(`· Open task: "${truncate(pending[0].title, 60)}".`);
  }
  if (!bullets.length) {
    return "· Overnight was quiet — no fresh urgencies.\n· Your day is clear; I'm holding it that way.\n· When you're ready, open chat and put me to work.";
  }
  while (bullets.length < 3) {
    bullets.push("· The rest of the day is prepared — ask me if you need a draft.");
  }
  return bullets.slice(0, 3).join("\n");
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function formatAgo(iso: string | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d >= 7) return `${Math.floor(d / 7)}w ago`;
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "just now";
}

function formatEventTime(start: string) {
  if (!start) return "—";
  // All-day dates are YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return "all day";
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return start.slice(11, 16) || start;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatNextEvent(events: CalendarEvent[]) {
  if (!events.length) return "Nothing scheduled — I'm keeping the room clear.";
  const e = events[0];
  return `${formatEventTime(e.start)} → ${e.summary}\n${
    e.location ? "at " + e.location : "held for you."
  }`;
}

function estimateDeepWork(events: CalendarEvent[]) {
  // Rough: workday 9–17 minus event hours today.
  const workMinutes = 8 * 60;
  let busy = 0;
  for (const e of events) {
    const s = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(end) && end > s) {
      busy += Math.min((end - s) / 60000, workMinutes);
    }
  }
  const free = Math.max(0, workMinutes - busy);
  const hours = Math.floor(free / 60);
  const mins = Math.round(free % 60);
  const label = free <= 0 ? "0h" : mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  const pct = Math.round((free / workMinutes) * 100);
  return { label, pct: Math.min(100, Math.max(8, pct)) };
}
