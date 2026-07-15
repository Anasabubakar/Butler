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
