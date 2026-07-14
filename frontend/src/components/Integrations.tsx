"use client";

import { useAuth } from "@/context/AuthContext";
import Card from "./Card";
import Chip from "./Chip";

const SERVICES = [
  {
    name: "Google Calendar",
    scope: "calendar",
    description: "View and manage your calendar events",
    color: "accent" as const,
  },
  {
    name: "Google Tasks",
    scope: "tasks",
    description: "Track and manage your task lists",
    color: "success" as const,
  },
  {
    name: "Gmail",
    scope: "gmail",
    description: "Read and manage your email inbox",
    color: "danger" as const,
  },
  {
    name: "Google Drive",
    scope: "drive",
    description: "Access and search your files",
    color: "warning" as const,
  },
  {
    name: "Google Contacts",
    scope: "contacts",
    description: "Access your contact information",
    color: "info" as const,
  },
];

export default function Integrations() {
  const { user, accessToken } = useAuth();
  const isConnected = !!accessToken;

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="max-w-xl mx-auto px-6 py-8">
        <h2 className="heading-lg mb-2">Integrations</h2>
        <p className="body-sm text-b-text-secondary mb-6">
          Your Google Workspace integrations, Boss.
        </p>

        <Card tone="raised" className="p-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-b-accent flex items-center justify-center text-white heading-sm"
            >
              {user?.displayName?.[0] || "G"}
            </div>
            <div className="flex-1">
              <p className="heading-xs">{user?.displayName || "Google Account"}</p>
              <p className="body-xs text-b-text-tertiary">{user?.email}</p>
            </div>
            <Chip tone={isConnected ? "success" : "danger"} variant="solid">
              {isConnected ? "Connected" : "Disconnected"}
            </Chip>
          </div>
        </Card>

        <div className="space-y-3">
          {SERVICES.map((svc) => (
            <Card key={svc.scope} tone="paper" radius="md" className="p-4">
              <div className="flex items-center gap-3">
                <Chip tone={svc.color} variant="soft">
                  {svc.scope}
                </Chip>
                <div className="flex-1">
                  <p className="heading-xs">{svc.name}</p>
                  <p className="body-xs text-b-text-tertiary">{svc.description}</p>
                </div>
                <Chip
                  tone={isConnected ? "success" : "neutral"}
                  variant="soft"
                >
                  {isConnected ? "Active" : "Inactive"}
                </Chip>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
