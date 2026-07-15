import type { Note, Delegation, Notification, UserSettings, ChatThread, Message } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getIdToken(): Promise<string | null> {
  const { getIdToken: fetchIdToken } = await import("./firebase");
  return fetchIdToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}

async function requestArray<T>(path: string, options: RequestInit = {}): Promise<T[]> {
  const data = await request<T[] | null>(path, options);
  return Array.isArray(data) ? data : [];
}

export const api = {
  butler: {
    chat: (data: {
      text: string;
      mode: string;
      threadId?: string;
      lat?: number;
      lng?: number;
    }) =>
      request<{
        text: string;
        thinking?: string;
        groundingSources?: Array<{ title: string; uri: string }>;
        threadId: string;
        modelUsed: string;
      }>("/api/butler/chat", { method: "POST", body: JSON.stringify(data) }),

    transcribe: (data: { audioBase64: string; mimeType: string }) =>
      request<{ text: string }>("/api/butler/transcribe", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    analyze: (data: {
      fileBase64: string;
      mimeType: string;
      prompt?: string;
    }) =>
      request<{ text: string }>("/api/butler/analyze", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  notes: {
    list: () => requestArray<Note>("/api/notes"),

    create: (data: {
      title: string;
      content: string;
      color?: string;
      tag?: string;
