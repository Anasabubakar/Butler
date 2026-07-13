export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode?: 'general' | 'low-latency' | 'thinking' | 'search' | 'maps';
  timestamp: string;
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
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  status: 'pending' | 'completed';
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
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface RouteOption {
  type: 'danfo' | 'brt' | 'korope' | 'maruwa' | 'keke' | 'okada' | 'uber' | 'driving' | 'walking';
  name: string;
  duration: string;
  cost?: string;
  description: string;
}
