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
