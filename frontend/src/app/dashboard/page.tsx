"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/firebase";
import CommandCenter from "@/components/CommandCenter";
import type { CalendarEvent, Task, GmailMessage, Note, Delegation } from "@/types";

export default function DashboardHome() {
  const { user, hasWorkspace, getGoogleAccessToken, reconnectWorkspace } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);

  const applyBrief = useCallback((brief: {
    events?: Array<{
      id: string;
      summary: string;
      start: string;
      end: string;
      description?: string;
      location?: string;
    }>;
    tasks?: Array<{ id: string; title: string; due?: string; status: string }>;
    emails?: Array<{
      id: string;
      subject: string;
      from: string;
      snippet: string;
      date: string;
    }>;
    connected?: boolean;
  }) => {
    setEvents((brief.events || []) as CalendarEvent[]);
    setTasks(
      (brief.tasks || []).map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due,
        status:
          t.status === "completed"
            ? ("completed" as const)
            : ("needsAction" as const),
      }))
    );
    setEmails((brief.emails || []) as GmailMessage[]);
    setServerConnected(Boolean(brief.connected));
  }, []);

  const fetchWorkspaceData = useCallback(async () => {
    setIsLoading(true);

    // 1) Prefer vaulted server-side Workspace (works after refresh).
    let usedServer = false;
    try {
      const sync = await api.workspace.sync();
      if (sync.brief) {
        applyBrief(sync.brief);
        usedServer = sync.brief.connected;
      }
    } catch {
      try {
        const brief = await api.workspace.brief();
        applyBrief(brief);
        usedServer = brief.connected;
      } catch {
        /* fall through to client token */
      }
    }

    // 2) Client Google token fallback + re-vault when available.
    const token = getGoogleAccessToken() || getAccessToken();
    if (token) {
      void api.integrations
        .registerGoogle({
          accessToken: token,
          email: user?.email || undefined,
        })
        .catch(() => undefined);

      if (!usedServer) {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const [calRes, taskRes, gmailRes] = await Promise.allSettled([
            fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
                new URLSearchParams({
                  timeMin: new Date().toISOString(),
                  timeMax: new Date(Date.now() + 86400000).toISOString(),
                  maxResults: "10",
                  singleEvents: "true",
                  orderBy: "startTime",
                }),
              { headers }
            ),
            fetch(
              "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?" +
                new URLSearchParams({ maxResults: "20", showCompleted: "false" }),
              { headers }
            ),
            fetch(
              "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
                new URLSearchParams({ maxResults: "10", q: "is:inbox" }),
              { headers }
            ),
          ]);

          if (calRes.status === "fulfilled" && calRes.value.ok) {
            const data = await calRes.value.json();
            setEvents(
              (data.items || []).map(
                (e: {
                  id: string;
                  summary?: string;
                  start?: { dateTime?: string; date?: string };
                  end?: { dateTime?: string; date?: string };
                  description?: string;
                  location?: string;
                }) => ({
                  id: e.id,
                  summary: e.summary || "(No title)",
                  start: e.start?.dateTime || e.start?.date || "",
                  end: e.end?.dateTime || e.end?.date || "",
                  description: e.description,
                  location: e.location,
                })
              )
            );
            setServerConnected(true);
          }

          if (taskRes.status === "fulfilled" && taskRes.value.ok) {
            const data = await taskRes.value.json();
            setTasks(
              (data.items || []).map(
                (t: { id: string; title?: string; due?: string; status?: string }) => ({
                  id: t.id,
                  title: t.title || "(Untitled)",
                  due: t.due,
                  status:
                    t.status === "completed"
                      ? ("completed" as const)
                      : ("needsAction" as const),
                })
              )
            );
          }

          if (gmailRes.status === "fulfilled" && gmailRes.value.ok) {
            const data = await gmailRes.value.json();
            const ids = (data.messages || []).slice(0, 5) as Array<{ id: string }>;
            const details = await Promise.all(
              ids.map((m) =>
                fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
                  { headers }
                ).then((r) => r.json())
              )
            );
            setEmails(
              details.map(
                (d: {
                  id: string;
                  snippet?: string;
                  internalDate?: string;
                  payload?: { headers?: Array<{ name: string; value: string }> };
                }) => {
                  const subjectHeader = d.payload?.headers?.find((h) => h.name === "Subject");
                  const fromHeader = d.payload?.headers?.find((h) => h.name === "From");
                  return {
                    id: d.id,
                    subject: subjectHeader?.value || "(No subject)",
                    from: fromHeader?.value?.replace(/<.*>/, "").trim() || "",
                    snippet: d.snippet || "",
                    date: new Date(parseInt(d.internalDate || "0", 10)).toISOString(),
                  };
                }
              )
            );
          }
        } catch (err) {
          console.error("Client workspace fetch error:", err);
        }
      }
    }

    try {
      const [notesData, delData] = await Promise.all([
        api.notes.list(),
        api.delegations.list(),
      ]);
      setNotes(notesData);
      setDelegations(delData);
    } catch {
      /* API may be offline */
    }

    setIsLoading(false);
  }, [applyBrief, getGoogleAccessToken, user?.email]);

  useEffect(() => {
    void fetchWorkspaceData();
  }, [fetchWorkspaceData, hasWorkspace]);

  const liveWorkspace = hasWorkspace || serverConnected;

  return (
    <CommandCenter
      user={user}
      events={events}
      tasks={tasks}
      emails={emails}
      notes={notes}
      delegations={delegations}
      isLoading={isLoading}
      hasWorkspace={liveWorkspace}
      onRefresh={fetchWorkspaceData}
      onReconnectWorkspace={async () => {
        await reconnectWorkspace();
        const token = getAccessToken();
        if (token) {
          try {
            await api.integrations.registerGoogle({
              accessToken: token,
              email: user?.email || undefined,
            });
          } catch {
            /* ignore */
          }
        }
        await fetchWorkspaceData();
      }}
      onOpenChat={() => router.push("/dashboard/chat")}
      onOpenDelegation={() => router.push("/dashboard/delegation")}
      onOpenNotifications={() => router.push("/dashboard/notifications")}
      onOpenNotes={() => router.push("/dashboard/notes")}
      onOpenIntegrations={() => router.push("/dashboard/integrations")}
    />
  );
}
