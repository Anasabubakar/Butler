"use client";

import { useState } from "react";
import Card from "./Card";
import Button from "./Button";

interface IntegrationsProps {
  hasWorkspace: boolean;
}

type Service = {
  name: string;
  role: string;
  scopes: string;
  sync: string;
  status: "connected" | "add";
};

const CONNECTED: Service[] = [
  { name: "Gmail",             role: "the inbox",     scopes: "Read · Write · Send",             sync: "2m ago",  status: "connected" },
  { name: "Google Calendar",   role: "the day",       scopes: "Read · Write · Move",             sync: "1m ago",  status: "connected" },
  { name: "Google Drive",      role: "the files",     scopes: "Read · Write · Organize",         sync: "30s ago", status: "connected" },
  { name: "Google Docs",       role: "the writing",   scopes: "Read · Write · Edit",             sync: "2m ago",  status: "connected" },
  { name: "Google Slides",     role: "the decks",     scopes: "Read · Write · Edit",             sync: "8m ago",  status: "connected" },
  { name: "GitHub",            role: "the code",      scopes: "Read repos, PRs, issues",         sync: "5m ago",  status: "connected" },
  { name: "Slack",             role: "the room",      scopes: "Read + write in your voice",      sync: "1m ago",  status: "connected" },
  { name: "Notion",            role: "the wiki",      scopes: "Read + write pages",              sync: "12m ago", status: "connected" },
  { name: "Linear",            role: "the roadmap",   scopes: "Read tickets · Comment",          sync: "3m ago",  status: "connected" },
];

const SUGGESTED: Service[] = [
  { name: "Jira",   role: "the tickets", scopes: "Not yet connected", sync: "—", status: "add" },
  { name: "Figma",  role: "the design",  scopes: "Not yet connected", sync: "—", status: "add" },
  { name: "Zapier", role: "the plumbing",scopes: "Not yet connected", sync: "—", status: "add" },
];

const ALL = [...CONNECTED, ...SUGGESTED];

export default function Integrations({ hasWorkspace }: IntegrationsProps) {
  const [tab, setTab] = useState<"all" | "connected" | "suggested" | "disconnected">("all");

  const list = tab === "all"
    ? ALL
    : tab === "connected"
    ? CONNECTED
    : tab === "suggested"
    ? SUGGESTED
    : [];

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: "var(--color-b-canvas)" }}>
      <div className="px-14 pt-14 pb-14 max-w-[1300px]">
        <h1 className="display-s" style={{ color: "var(--color-b-text-primary)" }}>Integrations</h1>
        <p className="body-lg mt-4" style={{ color: "var(--color-b-text-secondary)" }}>
          What Butler can touch on your behalf. Grant a service, and it joins the house.
        </p>

        {/* Tabs */}
        <div
          className="mt-8 flex gap-6 border-b"
          style={{ borderColor: "var(--color-b-border-subtle)" }}
        >
          {(
            [
              ["all",          `All · ${ALL.length}`],
              ["connected",    `Connected · ${CONNECTED.length}`],
              ["suggested",    `Suggested · ${SUGGESTED.length}`],
              ["disconnected", `Disconnected · 0`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="pb-3 relative"
              style={{ color: tab === key ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)" }}
            >
              <span className="body-md-med">{label}</span>
              {tab === key && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-0.5"
                  style={{ background: "var(--color-b-accent)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="mt-8 mb-2">
          <div className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>Your household</div>
          <h2 className="h-3 mt-1" style={{ color: "var(--color-b-text-primary)" }}>
            {hasWorkspace
              ? `${CONNECTED.length} services already speak to Butler.`
              : `${CONNECTED.length} services can speak to Butler as soon as you sign in.`}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {list.map((s) => (
            <ServiceCard key={s.name} svc={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ svc }: { svc: Service }) {
  const isConnected = svc.status === "connected";
  return (
    <Card tone="paper" className="p-6 flex flex-col gap-5 min-h-[180px]">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: "var(--color-b-sunken)" }}
        >
          <span className="mono-label" style={{ color: "var(--color-b-text-primary)" }}>
            {svc.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full"
          style={{ background: isConnected ? "var(--color-b-success)" : "var(--color-b-text-tertiary)" }}
        />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-4" style={{ color: "var(--color-b-text-primary)" }}>{svc.name}</div>
        <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{svc.role}</div>
        <div className="body-sm" style={{ color: "var(--color-b-text-secondary)" }}>{svc.scopes}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>{svc.sync}</span>
        {isConnected ? (
          <button className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>Manage →</button>
        ) : (
          <Button size="sm" variant="primary">Connect</Button>
        )}
      </div>
    </Card>
  );
}
