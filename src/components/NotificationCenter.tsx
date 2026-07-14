import React, { useState } from "react";
import Card from "./Card";
import Chip from "./Chip";

type NotifSource = "Gmail" | "Slack" | "GitHub" | "Calendar" | "Notion" | "Butler";

interface Notification {
  id: string;
  source: NotifSource;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tone: "accent" | "success" | "warning" | "danger" | "neutral" | "info";
}

const NOTIFICATIONS: Notification[] = [
  { id: "n1", source: "Gmail",    title: "Kai Rivera replied",           body: "RE: Series-B deck v9 — \"Looks good, one concern on the TAM slide.\"", time: "8m ago",  read: false, tone: "accent"  },
  { id: "n2", source: "Slack",    title: "#product · Nadia",             body: "Deploy window confirmed for Thursday. Ops is clear.",               time: "12m ago", read: false, tone: "info"    },
  { id: "n3", source: "GitHub",   title: "PR #142 ready for review",     body: "frontend — Kai opened a clean refactor on the hook layer.",          time: "22m ago", read: false, tone: "success" },
  { id: "n4", source: "Calendar", title: "Meridian moved to 10:45",      body: "Butler rescheduled — conflict with deploy window resolved.",         time: "34m ago", read: true,  tone: "neutral" },
  { id: "n5", source: "Notion",   title: "Q3 rituals page drafted",      body: "Butler created the outline — five sections, waiting on your mark.",  time: "1h ago",  read: true,  tone: "neutral" },
  { id: "n6", source: "GitHub",   title: "CI green on main",             body: "api repo — all checks passed. Deploy ready.",                       time: "1h ago",  read: true,  tone: "success" },
  { id: "n7", source: "Gmail",    title: "Board Sec. · board pack v3",   body: "Pack ready for review. 62% pre-filled by Butler.",                  time: "2h ago",  read: true,  tone: "accent"  },
  { id: "n8", source: "Slack",    title: "#ops · deploy ack",            body: "Butler acknowledged the window in your voice.",                     time: "2h ago",  read: true,  tone: "neutral" },
  { id: "n9", source: "Butler",   title: "Conflict resolved",            body: "Kai 1:1 × school run — held on Slack instead.",                    time: "3h ago",  read: true,  tone: "warning" },
];

const SOURCES: NotifSource[] = ["Gmail", "Slack", "GitHub", "Calendar", "Notion", "Butler"];

export default function NotificationsDesk() {
  const [filter, setFilter] = useState<NotifSource | "all">("all");
  const [items, setItems] = useState(NOTIFICATIONS);

  const unreadCount = items.filter((n) => !n.read).length;
  const filtered = filter === "all" ? items : items.filter((n) => n.source === filter);

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));

  const grouped = SOURCES.reduce<Record<string, Notification[]>>((acc, src) => {
    const matching = filtered.filter((n) => n.source === src);
    if (matching.length) acc[src] = matching;
    return acc;
  }, {});

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "var(--color-b-canvas)" }}>
      <div className="px-14 pt-14 pb-14 max-w-[1100px]">
        <h1 className="display-s" style={{ color: "var(--color-b-text-primary)" }}>Notifications</h1>
        <p className="body-lg mt-4" style={{ color: "var(--color-b-text-secondary)" }}>
          Everything that arrived while you were away. Butler sorted, grouped, and held the noise.
        </p>

        {/* Stat strip */}
        <div
          className="mt-8 flex items-center gap-8 px-6 py-4 rounded-[14px]"
          style={{ background: "var(--color-b-paper)", border: "1px solid var(--color-b-border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-1" style={{ color: "var(--color-b-text-primary)" }}>{unreadCount}</span>
            <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>unread</span>
          </div>
          <div
            className="w-px h-6"
            style={{ background: "var(--color-b-border-subtle)" }}
          />
          <div className="flex items-center gap-3">
            <span className="h-1" style={{ color: "var(--color-b-text-primary)" }}>{items.length}</span>
            <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>total today</span>
          </div>
          <div
            className="w-px h-6"
            style={{ background: "var(--color-b-border-subtle)" }}
          />
          <div className="flex items-center gap-3">
            <span className="h-1" style={{ color: "var(--color-b-text-primary)" }}>{Object.keys(grouped).length}</span>
            <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>sources active</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={markAllRead}
            className="mono-label"
            style={{ color: "var(--color-b-accent-text)" }}
          >
            Mark all read
          </button>
        </div>

        {/* Source filter tabs */}
        <div
          className="mt-6 flex gap-6 border-b"
          style={{ borderColor: "var(--color-b-border-subtle)" }}
        >
          <FilterTab
            label="All"
            count={items.length}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {SOURCES.map((src) => {
            const count = items.filter((n) => n.source === src).length;
            if (!count) return null;
            return (
              <FilterTab
                key={src}
                label={src}
                count={count}
                active={filter === src}
                onClick={() => setFilter(src)}
              />
            );
          })}
        </div>

        {/* Grouped notification list */}
        <div className="mt-8 flex flex-col gap-8">
          {Object.entries(grouped).map(([source, notifs]) => (
            <div key={source}>
              <div className="flex items-center gap-3 mb-3">
                <span className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>{source}</span>
                <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {notifs.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {notifs.map((n) => (
                  <Card
                    key={n.id}
                    tone="paper"
                    className="px-5 py-4 flex items-start gap-4 transition-opacity"
                    style={{ opacity: n.read ? 0.7 : 1 }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                      style={{ background: n.read ? "transparent" : "var(--color-b-accent)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="body-md-med truncate" style={{ color: "var(--color-b-text-primary)" }}>{n.title}</span>
                        <Chip tone={n.tone}>{n.source}</Chip>
                      </div>
                      <div className="body-sm mt-1 truncate" style={{ color: "var(--color-b-text-secondary)" }}>{n.body}</div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{n.time}</span>
                      <button
                        onClick={() => dismiss(n.id)}
                        className="mono-label"
                        style={{ color: "var(--color-b-text-tertiary)" }}
                      >
                        dismiss
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="body-md" style={{ color: "var(--color-b-text-tertiary)" }}>
                All clear, Boss. Nothing to show here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pb-3 relative"
      style={{ color: active ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)" }}
    >
      <span className="body-md-med">{label} · {count}</span>
      {active && (
        <span
          className="absolute left-0 right-0 -bottom-px h-0.5"
          style={{ background: "var(--color-b-accent)" }}
        />
      )}
    </button>
  );
}
