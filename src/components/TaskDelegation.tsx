import React, { useState } from "react";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

interface DelegatedTask {
  id: string;
  service: string;
  context: string;
  title: string;
  draft: string;
  tone: "accent" | "success" | "warning" | "neutral";
  toneLabel: string;
}

interface InFlightTask {
  id: string;
  service: string;
  context: string;
  title: string;
  status: string;
  tone: "accent" | "success" | "warning" | "neutral";
}

const AWAITING: DelegatedTask[] = [
  {
    id: "d1",
    service: "Slack",
    context: "Kai · #product",
    title: "Reply to deck thread — dry, warm.",
    draft: "\"Looks right, Kai. Two things: the TAM slide still says 2024, and the pricing table lost its footnote. Fix those, and it's ready for Monday.\"",
    tone: "accent",
    toneLabel: "dry · warm",
  },
  {
    id: "d2",
    service: "GitHub",
    context: "Repo · frontend",
    title: "PR #142: leave a review, approve.",
    draft: "\"Clean refactor — one nit on the hook dependency array (line 47), otherwise LGTM. Approving.\"",
    tone: "success",
    toneLabel: "constructive",
  },
  {
    id: "d3",
    service: "Notion",
    context: "Q3 rituals",
    title: "New page: I've drafted the outline.",
    draft: "\"Q3 Operating Rituals — cadence, owners, artefacts. Five sections, each ~2 lines. Ready for your fingerprint.\"",
    tone: "neutral",
    toneLabel: "neutral · outline",
  },
];

const IN_FLIGHT: InFlightTask[] = [
  {
    id: "f1",
    service: "Calendar",
    context: "Auto-hold",
    title: "Moved Meridian to 10:45 — told them why.",
    status: "confirmed · no reply needed",
    tone: "success",
  },
  {
    id: "f2",
    service: "GitHub",
    context: "CI · api repo",
    title: "Green on main — deploy ready.",
    status: "watching · will notify on failure",
    tone: "success",
  },
  {
    id: "f3",
    service: "Slack",
    context: "#ops",
    title: "Acknowledged deploy window for Nadia.",
    status: "sent · in your voice",
    tone: "accent",
  },
];

export default function TaskDelegation() {
  const [awaiting, setAwaiting] = useState(AWAITING);
  const [inFlight, setInFlight] = useState(IN_FLIGHT);

  const approve = (id: string) => {
    const task = awaiting.find((t) => t.id === id);
    setAwaiting((prev) => prev.filter((t) => t.id !== id));
    if (task) {
      setInFlight((prev) => [
        { id: task.id, service: task.service, context: task.context, title: task.title, status: "sent · approved", tone: "success" },
        ...prev,
      ]);
    }
  };

  const reject = (id: string) => {
    setAwaiting((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "var(--color-b-canvas)" }}>
      <div className="px-14 pt-14 pb-14 max-w-[1400px]">
        <h1 className="display-s" style={{ color: "var(--color-b-text-primary)" }}>Delegation</h1>
        <p className="body-lg mt-4" style={{ color: "var(--color-b-text-secondary)" }}>
          Butler acts in your voice. Review what's drafted, nod what's ready, and watch what's already moving.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-10">
          {/* LEFT: Awaiting your nod */}
          <div>
            <div className="flex items-baseline gap-3 mb-6">
              <div className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>Awaiting your nod</div>
              <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {awaiting.length} pending</div>
            </div>

            <div className="flex flex-col gap-5">
              {awaiting.length === 0 && (
                <Card tone="paper" className="p-6">
                  <div className="body-md" style={{ color: "var(--color-b-text-tertiary)" }}>
                    Nothing waiting, Boss. I'll surface the next one when it's ready.
                  </div>
                </Card>
              )}
              {awaiting.map((task) => (
                <Card key={task.id} tone="paper" className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>{task.service}</span>
                      <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {task.context}</span>
                    </div>
                    <Chip tone={task.tone}>{task.toneLabel}</Chip>
                  </div>

                  <div className="h-4" style={{ color: "var(--color-b-text-primary)" }}>{task.title}</div>

                  <div
                    className="rounded-[10px] px-5 py-4"
                    style={{ background: "var(--color-b-sunken)" }}
                  >
                    <div className="body-sm italic" style={{ color: "var(--color-b-text-secondary)" }}>
                      {task.draft}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="primary" onClick={() => approve(task.id)}>Approve</Button>
                    <Button size="sm" variant="secondary">Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => reject(task.id)}>Reject</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* RIGHT: In flight */}
          <div>
            <div className="flex items-baseline gap-3 mb-6">
              <div className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>In flight</div>
              <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {inFlight.length} active</div>
            </div>

            <div className="flex flex-col gap-4">
              {inFlight.map((task) => (
                <Card key={task.id} tone="paper" className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>{task.service}</span>
                    <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>· {task.context}</span>
                  </div>

                  <div className="body-md-med" style={{ color: "var(--color-b-text-primary)" }}>{task.title}</div>

                  <div className="flex items-center justify-between">
                    <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{task.status}</span>
                    <div className="flex items-center gap-2">
                      <button className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Watch</button>
                      <button className="mono-label" style={{ color: "var(--color-b-danger)" }}>Cancel</button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
