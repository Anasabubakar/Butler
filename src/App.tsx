import React, { useState, useEffect } from "react";
import Rail, { RailKey } from "./components/Rail";
import LandingPage from "./components/LandingPage";
import AuthScreen from "./components/AuthScreen";
import CommandCenter from "./components/CommandCenter";
import ChatInterface from "./components/ChatInterface";
import TaskDelegation from "./components/TaskDelegation";
import NotificationCenter from "./components/NotificationCenter";
import VoiceAssistant from "./components/VoiceAssistant";
import NotesManager from "./components/NotesManager";
import Integrations from "./components/Integrations";
import Settings from "./components/Settings";
import { initAuth, googleSignIn, logout } from "./lib/firebase";
import { User } from "firebase/auth";
import { CalendarEvent, GmailMessage, Task, DriveFile, Contact, Note } from "./types";

export default function App() {
  const [activeView, setActiveView] = useState<RailKey>("home");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  const [notes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("butler_notes");
    if (saved) try { return JSON.parse(saved); } catch { /* fall through */ }
    return [];
  });

  const mockCalendarEvents: CalendarEvent[] = [
    { id: "mock-evt-1", summary: "Q3 Operational Roadmap Alignment",      start: "02:00 PM", end: "03:00 PM", description: "Review milestones and deliverables with the team.",        location: "Virtual Boardroom" },
    { id: "mock-evt-2", summary: "Logistics Sync with Kai",               start: "04:30 PM", end: "05:15 PM", description: "Review transit times and deployment strategy.",             location: "Zoom" },
    { id: "mock-evt-3", summary: "UX/UI Critique: Design Rail",           start: "10:00 AM", end: "11:00 AM", description: "Examine bento grid layouts and touch targets.",             location: "Creative Suite" },
    { id: "mock-evt-4", summary: "VIP Luncheon / Budget Authorization",   start: "01:00 PM", end: "02:30 PM", description: "Confirm budget allocations and sign off.",                 location: "Sovereign Lounge" },
  ];
  const mockTasks: Task[] = [
    { id: "mock-tsk-1", title: "Review ML pipeline container build scripts",  status: "pending" },
    { id: "mock-tsk-2", title: "Authorize Q3 fiscal caps & travel vouchers",  status: "pending" },
    { id: "mock-tsk-3", title: "Audit vector embeddings search latency",      status: "completed" },
    { id: "mock-tsk-4", title: "Prepare transit report for operations",       status: "pending" },
  ];
  const mockEmails: GmailMessage[] = [
    { id: "mock-eml-1", subject: "Re: Deploy constraints",          from: "Kai Rivera",      snippet: "Boss, the deploy was delayed due to a bottleneck...",       date: new Date().toLocaleDateString([], { month: "short", day: "numeric" }), body: "" },
    { id: "mock-eml-2", subject: "Security Rule Audit",             from: "Nadia Chen",      snippet: "Boss, I completed auditing the security rules...",         date: new Date(Date.now() - 86400000).toLocaleDateString([], { month: "short", day: "numeric" }), body: "" },
    { id: "mock-eml-3", subject: "Board pack v3 ready",             from: "Board Secretary",  snippet: "Pack ready for review. 62% pre-filled by Butler.",        date: new Date(Date.now() - 172800000).toLocaleDateString([], { month: "short", day: "numeric" }), body: "" },
  ];
  const mockDriveFiles: DriveFile[] = [
    { id: "mock-sheet-1", name: "Q3 Fiscal Projections.xlsx",   mimeType: "application/vnd.google-apps.spreadsheet",  modifiedTime: new Date().toISOString(),                       webViewLink: "#" },
    { id: "mock-doc-1",   name: "Standard Operating Procedures",mimeType: "application/vnd.google-apps.document",     modifiedTime: new Date(Date.now() - 86400000).toISOString(),  webViewLink: "#" },
    { id: "mock-pres-1",  name: "Executive Roadmap Board.pptx", mimeType: "application/vnd.google-apps.presentation", modifiedTime: new Date(Date.now() - 172800000).toISOString(), webViewLink: "#" },
  ];
  const mockContacts: Contact[] = [
    { name: "Kai Rivera",   email: "kai@company.io",   phone: "+1 555 123 4567" },
    { name: "Nadia Chen",   email: "nadia@legal.co",   phone: "+1 555 019 1984" },
    { name: "Grace Hopper", email: "grace@nano.edu",    phone: "+1 555 194 7000" },
  ];

  useEffect(() => {
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
  }, []);

  const fetchWorkspaceData = async (accessToken: string) => {
    if (!accessToken) return;
    setIsLoadingWorkspace(true);

    if (accessToken === "demo-access-token") {
      await new Promise((r) => setTimeout(r, 600));
      setEvents(mockCalendarEvents);
      setTasks(mockTasks);
      setEmails(mockEmails);
      setDriveFiles(mockDriveFiles);
      setContacts(mockContacts);
      setIsLoadingWorkspace(false);
      return;
    }

    try {
      const fetchCalendar = async () => {
        try {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&singleEvents=true&orderBy=startTime&timeMin=${new Date().toISOString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return data.items?.map((item: any) => ({
            id: item.id,
            summary: item.summary || "No Title",
            start: item.start?.dateTime ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "All Day",
            end: item.end?.dateTime ? new Date(item.end.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "All Day",
            description: item.description,
            location: item.location,
          })) || [];
        } catch { return []; }
      };

      const fetchTasks = async () => {
        try {
          const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!listsRes.ok) return [];
          const listsData = await listsRes.json();
          const listId = listsData.items?.[0]?.id || "@default";
          const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false&maxResults=15`, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!tasksRes.ok) return [];
          const tasksData = await tasksRes.json();
          return tasksData.items?.map((item: any) => ({ id: item.id, title: item.title || "Untitled Task", due: item.due, status: item.status })) || [];
        } catch { return []; }
      };

      const fetchGmail = async () => {
        try {
          const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6", { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!gmailRes.ok) return [];
          const gmailData = await gmailRes.json();
          const messages = gmailData.messages || [];
          const detailed = [];
          for (const item of messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const headers = detail.payload?.headers || [];
              const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
              const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown";
              detailed.push({ id: detail.id, subject, from: from.split("<")[0].trim(), snippet: detail.snippet || "", date: new Date(parseInt(detail.internalDate)).toLocaleDateString([], { month: "short", day: "numeric" }), body: detail.snippet });
            }
          }
          return detailed;
        } catch { return []; }
      };

      const fetchDrive = async () => {
        try {
          const res = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc", { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) return [];
          const data = await res.json();
          return data.files || [];
        } catch { return []; }
      };

      const fetchContacts = async () => {
        try {
          const res = await fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=20", { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) return [];
          const data = await res.json();
          return data.connections?.map((c: any) => ({ name: c.names?.[0]?.displayName || "Unnamed", email: c.emailAddresses?.[0]?.value || "", phone: c.phoneNumbers?.[0]?.value || "" })) || [];
        } catch { return []; }
      };

      const [cal, tsk, gml, drv, cnt] = await Promise.all([fetchCalendar(), fetchTasks(), fetchGmail(), fetchDrive(), fetchContacts()]);
      setEvents(cal);
      setTasks(tsk);
      setEmails(gml);
      setDriveFiles(drv);
      setContacts(cnt);
    } catch (error) {
      console.error("Workspace fetch failed:", error);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    if (token) fetchWorkspaceData(token);
  }, [token]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Google Sign-In failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = () => {
    const sim = {
      uid: "demo-boss-123",
      displayName: "Boss",
      email: "boss@workspace.digital",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Boss",
      emailVerified: true,
    } as any;
    setUser(sim);
    setToken("demo-access-token");
    setNeedsAuth(false);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setShowAuth(false);
    setEvents([]);
    setTasks([]);
    setEmails([]);
    setDriveFiles([]);
    setContacts([]);
  };

  if (needsAuth) {
    if (showAuth) {
      return (
        <AuthScreen
          onGoogleSignIn={handleLogin}
          onDemoSignIn={handleDemoLogin}
          isSigningIn={isLoggingIn}
          error={authError}
        />
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (activeView === "voice") {
    return <VoiceAssistant onClose={() => setActiveView("home")} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-b-canvas)" }}>
      <Rail active={activeView} onSelect={setActiveView} />

      <main className="flex-1 overflow-hidden">
        {activeView === "home" && (
          <CommandCenter
            user={user}
            events={events}
            tasks={tasks}
            emails={emails}
            notes={notes}
            isLoading={isLoadingWorkspace}
            onRefresh={() => fetchWorkspaceData(token!)}
            onOpenChat={() => setActiveView("chat")}
            onOpenDelegation={() => setActiveView("delegation")}
            onOpenNotifications={() => setActiveView("notifications")}
            onOpenNotes={() => setActiveView("notes")}
          />
        )}
        {activeView === "brief" && (
          <CommandCenter
            user={user}
            events={events}
            tasks={tasks}
            emails={emails}
            notes={notes}
            isLoading={isLoadingWorkspace}
            onRefresh={() => fetchWorkspaceData(token!)}
            onOpenChat={() => setActiveView("chat")}
            onOpenDelegation={() => setActiveView("delegation")}
            onOpenNotifications={() => setActiveView("notifications")}
            onOpenNotes={() => setActiveView("notes")}
          />
        )}
        {activeView === "chat" && (
          <ChatInterface onOpenVoice={() => setActiveView("voice")} />
        )}
        {activeView === "delegation" && <TaskDelegation />}
        {activeView === "notifications" && <NotificationCenter />}
        {activeView === "notes" && <NotesManager />}
        {activeView === "integrations" && <Integrations hasWorkspace={!!token} />}
        {activeView === "settings" && <Settings user={user} onSignOut={handleLogout} />}
      </main>
    </div>
  );
}
