"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CommandCenter from "@/components/CommandCenter";
import type { CalendarEvent, Task, GmailMessage, Note, Delegation } from "@/types";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

interface GoogleTask {
  id: string;
  title?: string;
  due?: string;
  status?: string;
}

interface GoogleMessageRef {
  id: string;
}

interface GoogleMessageDetail {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

export default function DashboardHome() {
  const { user, hasWorkspace, getGoogleAccessToken, reconnectWorkspace } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaceData = useCallback(async () => {
    setIsLoading(true);
    const token = getGoogleAccessToken();

    if (token) {
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
              new URLSearchParams({
                maxResults: "20",
                showCompleted: "false",
              }),
            { headers }
          ),
          fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
              new URLSearchParams({
                maxResults: "10",
                q: "is:inbox",
              }),
            { headers }
          ),
        ]);

        if (calRes.status === "fulfilled" && calRes.value.ok) {
          const data = await calRes.value.json();
          setEvents(
            ((data.items || []) as GoogleCalendarEvent[]).map((e) => ({
              id: e.id,
              summary: e.summary || "(No title)",
              start: e.start?.dateTime || e.start?.date || "",
              end: e.end?.dateTime || e.end?.date || "",
              description: e.description,
              location: e.location,
            }))
          );
        } else {
          setEvents([]);
        }

        if (taskRes.status === "fulfilled" && taskRes.value.ok) {
          const data = await taskRes.value.json();
          setTasks(
            ((data.items || []) as GoogleTask[]).map((t) => ({
              id: t.id,
              title: t.title || "(Untitled)",
              due: t.due,
              status: t.status === "completed" ? ("completed" as const) : ("needsAction" as const),
            }))
          );
        } else {
          setTasks([]);
        }

        if (gmailRes.status === "fulfilled" && gmailRes.value.ok) {
          const data = await gmailRes.value.json();
          const ids = ((data.messages || []) as GoogleMessageRef[]).slice(0, 5);
          const details: GoogleMessageDetail[] = await Promise.all(
            ids.map((m) =>
              fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
                { headers }
              ).then((r) => r.json())
            )
          );
          setEmails(
            details.map((d) => {
