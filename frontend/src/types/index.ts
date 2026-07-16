export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  mode?: ChatMode;
  /** Frontend-normalized timestamp; backend may send createdAt. */
  timestamp?: string;
  createdAt?: string;
  isThinking?: boolean;
  groundingSources?: Array<{
    title: string;
    uri: string;
  }>;
  /** When Butler queues approvals, deep-link buttons use these ids. */
  delegationIds?: string[];
  actionsQueued?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  color?: string;
  tag?: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  status: "pending" | "completed" | "needsAction";
}

export interface Contact {
  name: string;
  email: string;
  phone?: string;
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  body?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  note?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export type ChatMode = "general" | "low-latency" | "thinking" | "search" | "maps";

export interface Delegation {
  id: string;
  service: string;
  context: string;
  title: string;
  draft: string;
  tone: "accent" | "success" | "warning" | "neutral";
  toneLabel: string;
  status: "awaiting" | "approved" | "rejected" | "in_flight";
}

export interface Notification {
  id: string;
  source: string;
  title: string;
  body: string;
  time?: string;
  createdAt?: string;
  read: boolean;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral" | "info";
}

export interface UserSettings {
  userId?: string;
  theme?: string;
  chatMode?: string;
  timezone?: string;
  warmth: number;
  formality: number;
  brevity: number;
  locationAutoDetect: boolean;
  locationText: string;
}

export interface ChatThread {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  tone?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  createdAt?: string;
}
