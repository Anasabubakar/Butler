"use client";

import { useState } from "react";
import Card from "./Card";
import Button from "./Button";

interface IntegrationsProps {
  hasWorkspace: boolean;
  onConnectWorkspace: () => Promise<boolean>;
}

type ServiceStatus = "connected" | "available" | "coming_soon";

type Service = {
  id: string;
  name: string;
  role: string;
  scopes: string;
  status: ServiceStatus;
  group: "google" | "work" | "automation";
};

const SERVICES: Service[] = [
  {
    id: "gmail",
    name: "Gmail",
    role: "the inbox",
    scopes: "Read · Write · Send",
    status: "available",
    group: "google",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    role: "the day",
    scopes: "Read · Write · Move",
    status: "available",
    group: "google",
  },
  {
    id: "drive",
    name: "Google Drive",
    role: "the files",
    scopes: "Read · Write · Organize",
    status: "available",
    group: "google",
  },
  {
    id: "docs",
    name: "Google Docs",
    role: "the writing",
    scopes: "Read · Write · Edit",
    status: "available",
    group: "google",
  },
  {
    id: "tasks",
    name: "Google Tasks",
    role: "the list",
    scopes: "Read · Write · Complete",
    status: "available",
    group: "google",
  },
  {
    id: "github",
    name: "GitHub",
    role: "the code",
    scopes: "Repos, PRs, issues",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "slack",
    name: "Slack",
    role: "the room",
    scopes: "Read + write in your voice",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "notion",
    name: "Notion",
    role: "the wiki",
    scopes: "Read + write pages",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "linear",
    name: "Linear",
    role: "the roadmap",
    scopes: "Tickets · Comments",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "figma",
    name: "Figma",
    role: "the design",
    scopes: "Files · Comments",
    status: "coming_soon",
    group: "work",
  },
  {
    id: "zapier",
    name: "Zapier",
    role: "the plumbing",
    scopes: "Automations",
    status: "coming_soon",
    group: "automation",
  },
  {
    id: "n8n",
    name: "n8n",
    role: "self-hosted flows",
    scopes: "Webhooks · Workflows",
    status: "coming_soon",
    group: "automation",
  },
];

export default function Integrations({ hasWorkspace, onConnectWorkspace }: IntegrationsProps) {
  const [tab, setTab] = useState<"all" | "connected" | "available" | "coming_soon">("all");
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resolved = SERVICES.map((s) => {
    if (s.group === "google") {
      return {
        ...s,
        status: (hasWorkspace ? "connected" : "available") as ServiceStatus,
        sync: hasWorkspace ? "live" : "—",
      };
    }
    return { ...s, sync: "—" };
  });

  const connected = resolved.filter((s) => s.status === "connected");
  const available = resolved.filter((s) => s.status === "available");
  const coming = resolved.filter((s) => s.status === "coming_soon");

  const list =
    tab === "all"
      ? resolved
      : tab === "connected"
      ? connected
      : tab === "available"
      ? available
      : coming;

  const handleConnect = async (svc: (typeof resolved)[0]) => {
    setMessage(null);
    if (svc.group === "google") {
      setConnecting(true);
      try {
        const ok = await onConnectWorkspace();
        setMessage(
          ok
            ? "Google Workspace connected. Calendar, Gmail, Tasks, and Drive are live."
            : "Could not complete Google connection. Try again."
        );
      } finally {
        setConnecting(false);
      }
      return;
    }
    setMessage(`${svc.name} OAuth is next on the roadmap — not available in this build.`);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[1300px]">
        <h1 className="display-s text-b-text-primary">Integrations</h1>
        <p className="body-lg mt-4 text-b-text-secondary">
          What Butler can touch on your behalf. Grant a service, and it joins the house.
        </p>

        {message && (
          <p className="body-sm mt-4 text-b-accent-text" role="status">
            {message}
          </p>
        )}

        <div className="mt-8 flex gap-6 border-b border-b-border-subtle">
          {(
            [
              ["all", `All · ${resolved.length}`],
              ["connected", `Connected · ${connected.length}`],
              ["available", `Available · ${available.length}`],
              ["coming_soon", `Coming soon · ${coming.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="pb-3 relative"
              style={{
                color: tab === key ? "var(--color-b-text-primary)" : "var(--color-b-text-tertiary)",
              }}
            >
              <span className="body-md-med">{label}</span>
              {tab === key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-b-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 mb-2">
          <div className="mono-label text-b-accent-text">Your household</div>
          <h2 className="type-h3 mt-1 text-b-text-primary">
            {hasWorkspace
              ? `${connected.length} Google services speak to Butler.`
              : "Connect Google Workspace to unlock calendar, mail, tasks, and files."}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {list.map((s) => (
            <ServiceCard
              key={s.id}
              svc={s}
              connecting={connecting}
              onAction={() => handleConnect(s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  svc,
  connecting,
  onAction,
}: {
  svc: {
    name: string;
    role: string;
    scopes: string;
    status: ServiceStatus;
    sync: string;
  };
  connecting: boolean;
  onAction: () => void;
}) {
  const isConnected = svc.status === "connected";
  const isComing = svc.status === "coming_soon";

  return (
    <Card tone="paper" className="p-6 flex flex-col gap-5 min-h-[180px]">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-b-sunken">
          <span className="mono-label text-b-text-primary">
            {svc.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
