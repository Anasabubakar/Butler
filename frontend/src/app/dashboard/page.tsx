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
