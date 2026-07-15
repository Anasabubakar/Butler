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

/** Command Center — mirrors the Figma "06 · Command Center" frame. */
export default function CommandCenter({
  user,
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
  const now = new Date();
  const dayLine = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const displayName = (user?.displayName?.split(" ")[0]) || "Boss";
  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;
  const urgentEmails = emails.length;

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "var(--color-b-canvas)" }}>
      {/* ==== TOP BAR ==== */}
      <div
        className="h-16 flex items-center justify-between px-8 border-b"
        style={{ borderColor: "var(--color-b-border-subtle)" }}
      >
        <div className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
          Command Center  ·  {dayLine}  ·  quiet mode
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] w-[340px]"
          style={{ background: "var(--color-b-paper)", border: "1px solid var(--color-b-border-subtle)" }}
        >
          <span className="body-md" style={{ color: "var(--color-b-text-tertiary)" }}>⌕</span>
          <button
            onClick={onOpenChat}
            className="flex-1 text-left body-sm"
            style={{ color: "var(--color-b-text-tertiary)" }}
          >
            Ask Butler anything — or press ⌘K
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="mono-label shrink-0"
            style={{ color: "var(--color-b-accent-text)" }}
            disabled={isLoading}
          >
            {isLoading ? "···" : "↻"}
          </button>
        </div>
      </div>

      {/* ==== HEADER ==== */}
      <div className="px-8 pt-8 pb-4">
        <h1 className="display-m" style={{ color: "var(--color-b-text-primary)" }}>
          Good morning, <em className="display-italic" style={{ fontStyle: "italic" }}>{displayName}.</em>
        </h1>
        <p className="body-lg mt-3" style={{ color: "var(--color-b-text-secondary)" }}>
          {urgentEmails + pendingTasks} things need you today. I&apos;ve held the rest.
          {isLoading && <span className="ml-2 mono-label" style={{ color: "var(--color-b-accent-text)" }}>syncing…</span>}
        </p>
      </div>

      {/* ==== BENTO GRID (12 col) ==== */}
      <div className="px-8 pb-10">
        <div className="grid grid-cols-12 gap-5">
          {/* THE BRIEF — cols 1-7, tall */}
          <Card tone="ink" bordered={false} className="col-span-12 xl:col-span-7 p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="mono-label mb-3" style={{ color: "var(--color-b-accent-text)" }}>
                The Brief  ·  {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <h2 className="h-2 mb-3" style={{ color: "var(--color-b-text-inverse)" }}>
                Three quiet moves before your first meeting.
              </h2>
              <div className="body-md whitespace-pre-line" style={{ color: "var(--color-b-text-tertiary)" }}>
                {briefFromData(emails, tasks, events)}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <Button variant="accent" size="md" onClick={onOpenDelegation}>Approve all three</Button>
              <button
                onClick={onOpenDelegation}
                className="body-sm-med"
                style={{ color: "var(--color-b-text-tertiary)" }}
              >
                Review each  ·  Ask Butler
              </button>
            </div>
          </Card>

          {/* FOCUS — cols 8-9, short */}
          <Card tone="raised" className="col-span-6 xl:col-span-2 p-5 min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>Deep work</div>
              <div className="h-1" style={{ color: "var(--color-b-text-primary)" }}>4h 20m</div>
              <div className="body-sm mt-1" style={{ color: "var(--color-b-text-secondary)" }}>held</div>
            </div>
            <div className="h-1.5 rounded-full mt-4" style={{ background: "var(--color-b-sunken)" }}>
              <div className="h-full rounded-full" style={{ width: "70%", background: "var(--color-b-accent)" }} />
            </div>
          </Card>

          {/* LOCATION — cols 10-12 */}
          <Card tone="raised" className="col-span-6 xl:col-span-3 p-5 min-h-[140px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>You are here</div>
            <div className="h-4" style={{ color: "var(--color-b-text-primary)" }}>Shoreditch, London</div>
            <div className="body-sm mt-2 whitespace-pre-line" style={{ color: "var(--color-b-text-secondary)" }}>
              {formatNextEvent(events)}
            </div>
          </Card>

          {/* WEATHER — cols 8-9 */}
          <Card tone="raised" className="col-span-6 xl:col-span-2 p-5 min-h-[140px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>47°F · Clear</div>
            <div className="h-4" style={{ color: "var(--color-b-text-primary)" }}>Cool afternoon</div>
            <div className="body-sm mt-2" style={{ color: "var(--color-b-text-secondary)" }}>
              A light jacket for the walk.
            </div>
          </Card>

          {/* AI ROUTER — cols 10-12 */}
          <Card tone="raised" className="col-span-6 xl:col-span-3 p-5 min-h-[140px]">
            <div className="mono-label mb-3" style={{ color: "var(--color-b-text-tertiary)" }}>AI router · today</div>
            <div className="flex flex-col gap-1.5">
              <RouterRow model="Claude"  task="writing · 12 tasks" />
              <RouterRow model="Gemini"  task="research · 4 tasks" />
              <RouterRow model="GPT"     task="drafting · 3 tasks" />
            </div>
          </Card>

          {/* AGENDA — cols 1-5 */}
          <Card tone="raised" className="col-span-12 xl:col-span-5 p-6 min-h-[320px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>Agenda · {now.toLocaleDateString([], { weekday: "short" })}</div>
            <h3 className="h-3 mb-4" style={{ color: "var(--color-b-text-primary)" }}>Held for you.</h3>
            <div className="flex flex-col gap-2.5">
              {(events.length ? events : DEMO_AGENDA).slice(0, 6).map((ev, i) => (
                <div key={ev.id || i} className="grid grid-cols-[60px_1fr_auto] gap-3 items-baseline">
                  <span className="mono-sm" style={{ color: "var(--color-b-accent-text)" }}>{ev.start}</span>
                  <span className="body-md-med truncate" style={{ color: "var(--color-b-text-primary)" }}>{ev.summary}</span>
                  <span className="body-sm truncate max-w-[180px]" style={{ color: "var(--color-b-text-tertiary)" }}>
                    {agendaNote(ev) || (ev.location ? "· " + ev.location : "held")}
                  </span>
                </div>
              ))}
              {!events.length && !isLoading && (
                <div className="body-sm mt-2" style={{ color: "var(--color-b-text-tertiary)" }}>No events on the calendar. I&apos;m keeping the day quiet.</div>
              )}
            </div>
          </Card>

          {/* INBOX — cols 6-8 */}
          <Card tone="raised" className="col-span-12 xl:col-span-3 p-6 min-h-[320px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-accent-text)" }}>Inbox · {emails.length} urgent</div>
            <h3 className="h-3 mb-4" style={{ color: "var(--color-b-text-primary)" }}>Drafts ready.</h3>
            <div className="flex flex-col gap-2.5">
              {(emails.length ? emails : DEMO_MAILS).slice(0, 5).map((m, i) => (
                <div key={m.id || i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="body-sm-med truncate" style={{ color: "var(--color-b-text-primary)" }}>{m.from}</div>
                    <div className="body-sm truncate" style={{ color: "var(--color-b-text-tertiary)" }}>{m.subject}</div>
                  </div>
                  <Chip tone={i % 3 === 0 ? "accent" : i % 3 === 1 ? "warning" : "neutral"}>
                    {i % 3 === 0 ? "draft" : i % 3 === 1 ? "held" : "open"}
                  </Chip>
                </div>
              ))}
              {!emails.length && !isLoading && (
                <div className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>Your inbox is quiet, Boss.</div>
              )}
            </div>
            <button
              onClick={onOpenNotifications}
              className="body-sm-med mt-4"
              style={{ color: "var(--color-b-accent-text)" }}
            >
              Open notifications desk  →
            </button>
          </Card>

          {/* DELEGATED — cols 9-12 */}
          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[320px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>Delegated · 3 pending nod</div>
            <h3 className="h-3 mb-4" style={{ color: "var(--color-b-text-primary)" }}>Awaiting you.</h3>
            <div className="flex flex-col gap-4">
              {DEMO_DELEGATED.map((d) => (
                <div key={d.title}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>{d.svc}</span>
                    <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>· {d.ctx}</span>
                  </div>
                  <div className="body-sm-med" style={{ color: "var(--color-b-text-primary)" }}>{d.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="primary" onClick={onOpenDelegation}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={onOpenDelegation}>Review</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* RECENT NOTES — cols 1-4 */}
          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>Memory · recent</div>
            <h3 className="h-4 mb-4" style={{ color: "var(--color-b-text-primary)" }}>What Butler remembers.</h3>
            <div className="flex flex-col gap-2.5">
              {(notes.length ? notes : DEMO_NOTES).slice(0, 4).map((n, i) => (
                <div key={n.id || i} className="flex items-start justify-between gap-3">
                  <span className="body-sm flex-1" style={{ color: "var(--color-b-text-primary)" }}>· {notePreview(n)}</span>
                  <span className="mono-sm flex-shrink-0" style={{ color: "var(--color-b-text-tertiary)" }}>{formatAgo(n.updatedAt)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onOpenNotes}
              className="body-sm-med mt-4"
              style={{ color: "var(--color-b-accent-text)" }}
            >
              Open memory  →
            </button>
          </Card>

          {/* GITHUB — cols 5-8 */}
          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-text-tertiary)" }}>GitHub · last 8h</div>
            <h3 className="h-4 mb-4" style={{ color: "var(--color-b-text-primary)" }}>The code moved.</h3>
            <div className="flex flex-col gap-3">
              {GITHUB_EVENTS.map((e) => (
                <div key={e.id} className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: `var(--color-b-${e.tone})` }}
                  />
                  <span className="mono-md w-14 flex-shrink-0" style={{ color: "var(--color-b-text-primary)" }}>{e.id}</span>
                  <div className="min-w-0">
                    <div className="body-sm" style={{ color: "var(--color-b-text-secondary)" }}>{e.action}</div>
                    <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {e.repo}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* CONFLICTS — cols 9-12 */}
          <Card tone="raised" className="col-span-12 xl:col-span-4 p-6 min-h-[260px]">
            <div className="mono-label mb-2" style={{ color: "var(--color-b-warning)" }}>Conflicts · 2</div>
            <h3 className="h-4 mb-4" style={{ color: "var(--color-b-text-primary)" }}>I already handled these.</h3>
            <div className="flex flex-col gap-4">
              {CONFLICTS.map((c) => (
                <div key={c.title}>
                  <div className="mono-sm" style={{ color: "var(--color-b-warning)" }}>{c.time}</div>
                  <div className="body-md-med" style={{ color: "var(--color-b-text-primary)" }}>{c.title}</div>
                  <div className="mono-sm mt-1" style={{ color: "var(--color-b-accent-text)" }}>Butler → {c.resolution}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Small horizontal helper for the AI router card. */
function RouterRow({ model, task }: { model: string; task: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="body-sm-med w-16" style={{ color: "var(--color-b-text-primary)" }}>{model}</span>
      <span className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{task}</span>
    </div>
  );
}

/** Compose the ink Brief bullets from real data + Butler-flavoured wording. */
function briefFromData(emails: GmailMessage[], tasks: Task[], events: CalendarEvent[]) {
  const bullets: string[] = [];
  if (emails.length) {
    const first = emails[0];
    bullets.push(`· ${first.from}'s message on "${truncate(first.subject, 40)}" is waiting — draft ready.`);
  }
  if (events.length > 1) {
    bullets.push(`· Your ${events[0].start} and ${events[1].start} sit close — I'll pace the transition.`);
  }
  const pending = tasks.filter((t) => t.status !== "completed").slice(0, 1);
  if (pending.length) {
    bullets.push(`· "${truncate(pending[0].title, 60)}" is still open — I marked what's missing.`);
  }
  if (!bullets.length) {
    return "· Overnight was quiet — no fresh urgencies.\n· Your day is clear; I'm holding it that way.\n· When you're ready, I have three drafts waiting.";
  }
  while (bullets.length < 3) bullets.push("· The rest of the day is already prepared, Boss.");
  return bullets.join("\n");
}

type AgendaEvent = CalendarEvent & { note?: string };
type DemoMail = Pick<GmailMessage, "id" | "from" | "subject">;
type DemoNote = Pick<Note, "id" | "title" | "content" | "updatedAt">;

function agendaNote(ev: CalendarEvent): string | undefined {
  return (ev as AgendaEvent).note;
}

function notePreview(n: Note | DemoNote): string {
  return n.title || n.content?.slice(0, 60) || "";
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function formatAgo(iso: string | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d >= 7) return `${Math.floor(d / 7)}w ago`;
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "just now";
}
function formatNextEvent(events: CalendarEvent[]) {
  if (!events.length) return "Nothing scheduled — I'm keeping the room clear.";
  const e = events[0];
  return `${e.start} → ${e.summary}\n${e.location ? "at " + e.location : "held for you."}`;
}

// ==== Fallback / demo content matching Figma copy ====
const DEMO_AGENDA: AgendaEvent[] = [
  { id: "1",  summary: "Standup",         start: "09:00", end: "09:30", note: "no doc · quiet" },
  { id: "2",  summary: "Meridian HQ",     start: "10:45", end: "11:30", note: "moved by Butler" },
  { id: "3",  summary: "Lunch break",     start: "12:30", end: "13:30", note: "held" },
  { id: "4",  summary: "Deep work",       start: "13:30", end: "16:00", note: "protected" },
  { id: "5",  summary: "1:1 with Kai",    start: "16:00", end: "16:45", note: "draft topics ready" },
  { id: "6",  summary: "Board pack review", start: "18:00", end: "18:45", note: "62% ready" },
];
const DEMO_MAILS: DemoMail[] = [
  { id: "1", from: "Kai Rivera",   subject: "RE: Series-B deck v9" },
  { id: "2", from: "Meridian Ops", subject: "Deploy window request" },
  { id: "3", from: "Board Sec.",   subject: "Board pack v3 ready" },
  { id: "4", from: "Nadia Ahmed",  subject: "contract sig · terms" },
  { id: "5", from: "Jules Park",   subject: "1:1 topic list" },
];
const DEMO_DELEGATED = [
  { svc: "Slack",  ctx: "Kai",             title: "Reply to deck thread — dry, warm." },
  { svc: "GitHub", ctx: "Repo · frontend", title: "PR #142: leave a review, approve." },
  { svc: "Notion", ctx: "Q3 rituals",      title: "New page: I drafted the outline." },
];
const DEMO_NOTES: DemoNote[] = [
  { id: "d1", title: "Kai prefers dry replies before 10am.", content: "", updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "d2", title: "Meridian is sensitive to deployment windows.", content: "", updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "d3", title: "Board reads best with a graph up front.", content: "", updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "d4", title: "Late-week Fridays: no deep-work holds.", content: "", updatedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
];
const GITHUB_EVENTS = [
  { id: "#142", action: "opened by Kai",    repo: "frontend", tone: "accent"  },
  { id: "#140", action: "merged by Ola",    repo: "api",      tone: "success" },
  { id: "#139", action: "draft by you",     repo: "frontend", tone: "warning" },
  { id: "CI",   action: "green on main",    repo: "system",   tone: "success" },
];
const CONFLICTS = [
  { time: "10:00", title: "Meridian × deploy",     resolution: "moved to 10:45" },
  { time: "15:00", title: "Kai 1:1 × school run",  resolution: "held on Slack" },
];
