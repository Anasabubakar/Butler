import type { Note, Delegation, Notification, UserSettings, ChatThread, Message } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getIdToken(): Promise<string | null> {
  const { auth } = await import("./firebase");
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
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
    list: () => request<Note[]>("/api/notes"),

    create: (data: {
      title: string;
      content: string;
      color?: string;
      tag?: string;
    }) =>
      request<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<Pick<Note, "title" | "content" | "color" | "tag">>) =>
      request<Note>(`/api/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<void>(`/api/notes/${id}`, { method: "DELETE" }),
  },

  delegations: {
    list: (status?: string) =>
      request<Delegation[]>(
        `/api/delegations${status ? `?status=${status}` : ""}`
      ),

    approve: (id: string) =>
      request<void>(`/api/delegations/${id}/approve`, { method: "POST" }),

    reject: (id: string) =>
      request<void>(`/api/delegations/${id}/reject`, { method: "POST" }),
  },

  notifications: {
    list: (source?: string) =>
      request<Notification[]>(
        `/api/notifications${source ? `?source=${source}` : ""}`
      ),

    markRead: (id: string) =>
      request<void>(`/api/notifications/${id}/read`, { method: "POST" }),

    markAllRead: () =>
      request<void>("/api/notifications/read-all", { method: "POST" }),
  },

  settings: {
    get: () => request<UserSettings>("/api/settings"),

    update: (data: Partial<UserSettings>) =>
      request<UserSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  chat: {
    threads: () => request<ChatThread[]>("/api/butler/threads"),

    messages: (threadId: string) =>
      request<Message[]>(`/api/butler/threads/${threadId}/messages`),
  },
};
