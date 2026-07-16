import type { Note, Delegation, Notification, UserSettings, ChatThread, Message } from "@/types";

/**
 * Normalize NEXT_PUBLIC_API_URL so misconfigured envs like
 * "https//host" or "https://https://host" never break fetch/CORS.
 */
export function normalizeApiBase(raw?: string | null): string {
  let base = (raw || "http://localhost:8080").trim();
  // Common misconfig: "https//host" (missing colon)
  base = base.replace(/^(https?)\/\//i, "$1://");
  // "https:/host" (one slash)
  base = base.replace(/^(https?):\/(?!\/)/i, "$1://");
  // Repeated schemes: "https://https://host" or "https://https//host"
  for (let i = 0; i < 3; i++) {
    base = base.replace(/^https?:\/\/https?:\/\//i, "https://");
    base = base.replace(/^https?:\/\/https?\/\//i, "https://");
  }
  base = base.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base.replace(/^\/+/, "")}`;
  }
  return base;
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

async function getIdToken(): Promise<string | null> {
  const { getIdToken: fetchIdToken } = await import("./firebase");
  return fetchIdToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    let message = error || res.statusText;
    try {
      const parsed = JSON.parse(error) as { error?: string };
      if (parsed?.error) message = parsed.error;
    } catch {
      /* plain text body */
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
        actionsQueued?: number;
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
      requestArray<Delegation>(
        `/api/delegations${status ? `?status=${status}` : ""}`
      ),

    create: (data: {
      title: string;
      service: string;
      context: string;
      draft?: string;
      tone?: string;
      toneLabel?: string;
    }) =>
      request<Delegation>("/api/delegations", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    approve: (id: string) =>
      request<Delegation>(`/api/delegations/${id}/approve`, { method: "POST" }),

    reject: (id: string) =>
      request<Delegation>(`/api/delegations/${id}/reject`, { method: "POST" }),
  },

  notifications: {
    list: (source?: string) =>
      requestArray<Notification>(
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
    threads: () => requestArray<ChatThread>("/api/butler/threads"),

    messages: (threadId: string) =>
      requestArray<Message>(`/api/butler/threads/${threadId}/messages`),
  },

  integrations: {
    list: () => requestArray<IntegrationCatalogItem>("/api/integrations"),

    connect: (provider: string, redirectTo?: string) =>
      request<ConnectResponse>(`/api/integrations/${provider}/connect`, {
        method: "POST",
        body: JSON.stringify({ redirectTo }),
      }),

    disconnect: (provider: string) =>
      requestVoid(`/api/integrations/${provider}`, { method: "DELETE" }),

    registerGoogle: (data: { accessToken: string; email?: string; scopes?: string }) =>
      request<IntegrationConnection>("/api/integrations/google", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  workspace: {
    brief: () => request<WorkspaceBrief>("/api/workspace/brief"),

    sync: () =>
      request<WorkspaceSyncResult>("/api/workspace/sync", { method: "POST" }),
  },
};

export interface WorkspaceBrief {
  events: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    due?: string;
    status: string;
  }>;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    snippet: string;
    date: string;
  }>;
  conflicts: Array<{ time: string; title: string; resolution: string }>;
  connected: boolean;
  tokenExpired?: boolean;
  fetchedAt: string;
}

export interface WorkspaceSyncResult {
  brief: WorkspaceBrief;
  notificationsCreated: number;
  delegationsCreated: number;
  proactiveEnabled: boolean;
}

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  role: string;
  scopes: string;
  group: string;
  status: "connected" | "available" | "not_configured" | "coming_soon";
  accountLabel?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  authType: string;
  configured: boolean;
  docsUrl?: string;
  setupHint?: string;
  callbackUrl?: string;
}

export interface ConnectResponse {
  provider: string;
  authUrl?: string;
  mode: "redirect" | "client" | "disabled";
  message?: string;
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  accountLabel: string;
  status: string;
}

async function requestVoid(path: string, options: RequestInit = {}): Promise<void> {
  await request<void>(path, options);
}
