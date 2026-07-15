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
