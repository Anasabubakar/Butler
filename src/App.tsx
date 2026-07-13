import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import HomeDashboard from "./components/HomeDashboard";
import ChatInterface from "./components/ChatInterface";
import WorkspaceHub from "./components/WorkspaceHub";
import VoiceAssistant from "./components/VoiceAssistant";
import NotesManager from "./components/NotesManager";
import TaskDelegation from "./components/TaskDelegation";
import NotificationCenter from "./components/NotificationCenter";
import { initAuth, googleSignIn, logout } from "./lib/firebase";
import { User } from "firebase/auth";
import { CalendarEvent, GmailMessage, Task, DriveFile, Contact, Note } from "./types";
import { Sparkles, RefreshCw, Briefcase } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Workspace Data States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(false);

  const mockCalendarEvents: CalendarEvent[] = [
    {
      id: "mock-evt-1",
      summary: "Q3 Operational Roadmap Alignment",
      start: "02:00 PM",
      end: "03:00 PM",
      description: "Review milestones, cross-channel deliverables, and draft operational notes with Sarah and Kunle.",
      location: "Virtual Boardroom / Teams"
    },
    {
      id: "mock-evt-2",
      summary: "Nigeria Logistics Sync with Kunle",
      start: "04:30 PM",
      end: "05:15 PM",
      description: "Review transit times, Danfo routes, and bypass solutions for Lekki bridge construction congestion.",
      location: "Lagos Hub / Call Link"
    },
    {
      id: "mock-evt-3",
      summary: "UX/UI Critique: Design Rail & Negative Space",
      start: "10:00 AM",
      end: "11:00 AM",
      description: "Examine bento grid layouts, typeface pairings, and ensure touch targets meet the 44px mandate.",
      location: "Creative Suite"
    },
    {
      id: "mock-evt-4",
      summary: "VIP Luncheon / Budget Authorization",
      start: "01:00 PM",
      end: "02:30 PM",
      description: "Confirm budget allocations and sign off on travel vouchers.",
      location: "Sovereign Lounge"
    }
  ];

  const mockTasks: Task[] = [
    {
      id: "mock-tsk-1",
      title: "Review ML pipeline container build scripts",
      status: "pending"
    },
    {
      id: "mock-tsk-2",
      title: "Authorize Q3 fiscal caps & travel vouchers",
      status: "pending"
    },
    {
      id: "mock-tsk-3",
      title: "Audit vector embeddings search latency",
      status: "completed"
    },
    {
      id: "mock-tsk-4",
      title: "Prepare transit times for Nigeria operations",
      status: "pending"
    }
  ];

  const mockEmails: GmailMessage[] = [
    {
      id: "mock-eml-1",
      subject: "Re: Traffic constraints on Third Mainland Bridge",
      from: "Kunle Bello",
      snippet: "Boss, the Danfo shuttles are delayed due to a bottle-neck near Ikeja Underbridge. Recommend BRT for the cargo team instead...",
      date: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
      body: "Boss, the Danfo shuttles are delayed due to a bottle-neck near Ikeja Underbridge. Recommend BRT for the cargo team instead because the BRT lanes are currently clear. Let me know if you would like me to finalize the transit transition."
    },
    {
      id: "mock-eml-2",
      subject: "System Integration Security Rule Audit",
      from: "Sarah Connor",
      snippet: "Boss, I completed auditing the security rules for the Firestore container. No leaks found. All paths require verified authentication...",
      date: new Date(Date.now() - 86400000).toLocaleDateString([], { month: "short", day: "numeric" }),
      body: "Boss, I completed auditing the security rules for the Firestore container. No leaks found. All paths require verified authentication, keeping user-authored data strictly secure."
    },
    {
      id: "mock-eml-3",
      subject: "New Coursework Assigned in AI Architecture",
      from: "Google Classroom",
      snippet: "A new coursework assignment has been scheduled in AI Systems Architecture. Title: ML Pipeline deployment to production containers...",
      date: new Date(Date.now() - 172800000).toLocaleDateString([], { month: "short", day: "numeric" }),
      body: "A new coursework assignment has been scheduled in AI Systems Architecture. Title: ML Pipeline deployment to production containers. Due date: Aug 15."
    }
  ];

  const mockDriveFiles: DriveFile[] = [
    {
      id: "mock-sheet-1",
      name: "Q3 Fiscal Projections.xlsx",
      mimeType: "application/vnd.google-apps.spreadsheet",
      modifiedTime: new Date().toISOString(),
      webViewLink: "https://docs.google.com/spreadsheets"
    },
    {
      id: "mock-doc-1",
      name: "Standard Operating Procedures.docx",
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: new Date(Date.now() - 86400000).toISOString(),
      webViewLink: "https://docs.google.com/document"
    },
    {
      id: "mock-pres-1",
      name: "Executive Roadmap Board.pptx",
      mimeType: "application/vnd.google-apps.presentation",
      modifiedTime: new Date(Date.now() - 172800000).toISOString(),
      webViewLink: "https://docs.google.com/presentation"
    },
    {
      id: "mock-form-1",
      name: "Nigeria Logistics Feedback Form",
      mimeType: "application/vnd.google-apps.form",
      modifiedTime: new Date(Date.now() - 259200000).toISOString(),
      webViewLink: "https://docs.google.com/forms"
    }
  ];

  const mockContacts: Contact[] = [
    {
      name: "Kunle Bello",
      email: "kunle@logistics.ng",
      phone: "+234 803 123 4567"
    },
    {
      name: "Sarah Connor",
      email: "sarah@cyberdyne.io",
      phone: "+1 555 019 1984"
    },
    {
      name: "Grace Hopper",
      email: "grace@nanoseconds.edu",
      phone: "+1 555 194 7000"
    }
  ];

  // Offline Notes State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("butler_local_notes");
    return saved ? JSON.parse(saved) : [
      {
        id: "sample-note-1",
        title: "Standard Operating Procedures",
        content: "1. Butler ALWAYS addresses Boss as 'Boss'.\n2. Conserve resources, automate administrative triggers.\n3. Conduct rapid multi-source analysis.",
        updatedAt: new Date().toLocaleString(),
        color: "amber"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("butler_local_notes", JSON.stringify(notes));
  }, [notes]);

  // Listen to Auth State
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

  // Fetch all Workspace Data in parallel
  const fetchWorkspaceData = async (accessToken: string) => {
    if (!accessToken) return;
    setIsLoadingWorkspace(true);
    
    if (accessToken === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setEvents(mockCalendarEvents);
      setTasks(mockTasks);
      setEmails(mockEmails);
      setDriveFiles(mockDriveFiles);
      setContacts(mockContacts);
      setIsLoadingWorkspace(false);
      return;
    }

    try {
      // 1. Fetch Calendar Events
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
            start: item.start?.dateTime 
              ? new Date(item.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : "All Day",
            end: item.end?.dateTime 
              ? new Date(item.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : "All Day",
            description: item.description,
            location: item.location
          })) || [];
        } catch (err) {
          console.error("Error fetching Calendar events:", err);
          return [];
        }
      };

      // 2. Fetch Google Tasks
      const fetchTasks = async () => {
        try {
          const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!listsRes.ok) return [];
          const listsData = await listsRes.json();
          const listId = listsData.items?.[0]?.id || "@default";

          const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false&maxResults=15`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!tasksRes.ok) return [];
          const tasksData = await tasksRes.json();
          return tasksData.items?.map((item: any) => ({
            id: item.id,
            title: item.title || "Untitled Task",
            due: item.due,
            status: item.status
          })) || [];
        } catch (err) {
          console.error("Error fetching Tasks:", err);
          return [];
        }
      };

      // 3. Fetch Gmail Snippets
      const fetchGmail = async () => {
        try {
          const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!gmailRes.ok) return [];
          const gmailData = await gmailRes.json();
          const messages = gmailData.messages || [];
          
          const detailed = [];
          for (const item of messages) {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              const headers = detail.payload?.headers || [];
              const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
              const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown";
              detailed.push({
                id: detail.id,
                subject,
                from: from.split("<")[0].trim(),
                snippet: detail.snippet || "",
                date: new Date(parseInt(detail.internalDate)).toLocaleDateString([], { month: "short", day: "numeric" }),
                body: detail.snippet
              });
            }
          }
          return detailed;
        } catch (err) {
          console.error("Error fetching Gmail messages:", err);
          return [];
        }
      };

      // 4. Fetch Google Drive Files
      const fetchDrive = async () => {
        try {
          const res = await fetch(
            "https://www.googleapis.com/drive/v3/files?pageSize=12&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return data.files || [];
        } catch (err) {
          console.error("Error fetching Drive files:", err);
          return [];
        }
      };

      // 5. Fetch Contacts connections (People API)
      const fetchContacts = async () => {
        try {
          const res = await fetch(
            "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=20",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return data.connections?.map((c: any) => ({
            name: c.names?.[0]?.displayName || "Unnamed Connection",
            email: c.emailAddresses?.[0]?.value || "",
            phone: c.phoneNumbers?.[0]?.value || ""
          })) || [];
        } catch (err) {
          console.error("Error fetching Contacts connections:", err);
          return [];
        }
      };

      // Resolve all Workspace requests concurrently
      const [cal, tsk, gml, drv, cnt] = await Promise.all([
        fetchCalendar(),
        fetchTasks(),
        fetchGmail(),
        fetchDrive(),
        fetchContacts()
      ]);

      setEvents(cal);
      setTasks(tsk);
      setEmails(gml);
      setDriveFiles(drv);
      setContacts(cnt);

    } catch (error) {
      console.error("Parallel workspace cache failed:", error);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkspaceData(token);
    }
  }, [token]);

  // Perform a Google Login
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
      console.error("Authentication trigger failed:", err);
      setAuthError(err.message || "Google Sign-In failed due to network or sandbox iframe restrictions.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Perform a Demo Login Simulator Bypass
  const handleDemoLogin = () => {
    const simulatedUser = {
      uid: "demo-boss-123",
      displayName: "Boss",
      email: "boss@workspace.digital",
      photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Boss",
      emailVerified: true,
    } as any;
    
    setUser(simulatedUser);
    setToken("demo-access-token");
    setNeedsAuth(false);
  };

  // Perform Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setEvents([]);
    setTasks([]);
    setEmails([]);
    setDriveFiles([]);
    setContacts([]);
  };

  // Render Authentication landing gate if needsAuth
  if (needsAuth) {
    return (
      <div id="auth-gate-container" className="flex flex-col items-center justify-center min-h-screen bg-elegant-bg text-elegant-text p-6 font-sans">
        <div className="w-full max-w-md bg-elegant-card border border-elegant-border p-8 rounded-2xl text-center space-y-6 shadow-[0_0_30px_rgba(212,175,55,0.03)] relative overflow-hidden">
          {/* Glowing element */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-elegant-gold/5 rounded-full blur-2xl"></div>
          
          <div className="space-y-3">
            <div className="mx-auto bg-elegant-gold/10 border border-elegant-gold/20 w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <Sparkles className="w-5 h-5 text-elegant-gold stroke-[1.5]" />
            </div>
            <h1 className="text-2xl font-light tracking-[0.2em] text-white uppercase italic">Butler</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] font-mono text-elegant-gold font-medium">Digital Chief of Staff</p>
          </div>

          <p className="text-xs text-elegant-muted leading-relaxed max-w-sm mx-auto font-sans">
            Welcome, Boss. I am your specialized digital coordinator. Authenticate your secure connection below to unify your calendar, task core, email drafts, file browser, and contacts directory.
          </p>

          {authError && (
            <div className="p-4 bg-red-950/20 border border-red-500/25 text-red-300 text-[11px] rounded-xl leading-relaxed text-left space-y-1.5 shadow-inner">
              <p className="font-semibold flex items-center gap-1.5 uppercase tracking-wider font-mono text-[9px] text-red-400">
                Connection Restriction Detected
              </p>
              <p className="font-sans font-medium text-red-200">
                {authError}
              </p>
              <p className="font-sans opacity-80 mt-1">
                Notice: Sandbox or iframe policies in certain browsers can prevent OAuth popups. You can bypass this restriction and explore all workspace features instantly by entering Simulator Mode.
              </p>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {isLoggingIn ? (
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-elegant-muted py-3">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-elegant-gold" />
                Synchronizing OAuth tunnel...
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  id="google-login-btn"
                  onClick={handleLogin}
                  className="gsi-material-button mx-auto shadow-[0_4px_15px_rgba(0,0,0,0.4)] border border-elegant-border hover:border-elegant-border-light transition-all duration-300 w-full"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-sans font-semibold">Sign in with Google</span>
                  </div>
                </button>

                <div className="flex items-center gap-2 py-1">
                  <div className="h-px bg-elegant-border flex-1"></div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-elegant-dark">or</span>
                  <div className="h-px bg-elegant-border flex-1"></div>
                </div>

                <button
                  id="demo-login-btn"
                  onClick={handleDemoLogin}
                  className="w-full py-3 bg-elegant-card border border-elegant-border hover:border-elegant-gold/40 text-elegant-muted hover:text-white text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-elegant-gold animate-pulse" />
                  Boss, Run Simulator Mode (Demo)
                </button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-elegant-border/40 flex items-center justify-center gap-2 text-[9px] font-mono text-elegant-muted tracking-wider uppercase">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_#10b981]"></span>
            <span>Security Module Operational</span>
          </div>
        </div>
      </div>
    );
  }

  // Active authenticated layout
  return (
    <div id="butler-workspace-grid" className="flex h-screen bg-elegant-bg overflow-hidden font-sans">
      
      {/* Structural Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Primary Dynamic View Content */}
      <main id="main-view-panel" className="flex-1 overflow-y-auto bg-elegant-bg relative">
        {currentTab === "home" && (
          <HomeDashboard 
            user={user}
            events={events}
            tasks={tasks}
            emails={emails}
            notes={notes}
            isLoadingWorkspace={isLoadingWorkspace}
            onRefreshWorkspace={() => fetchWorkspaceData(token!)}
          />
        )}
        {currentTab === "chat" && <ChatInterface />}
        {currentTab === "workspace" && (
          <WorkspaceHub 
            token={token}
            events={events}
            tasks={tasks}
            emails={emails}
            driveFiles={driveFiles}
            contacts={contacts}
            isLoading={isLoadingWorkspace}
            onRefresh={() => fetchWorkspaceData(token!)}
          />
        )}
        {currentTab === "delegation" && (
          <TaskDelegation 
            tasks={tasks}
            contacts={contacts}
            onRefreshTasks={() => fetchWorkspaceData(token!)}
          />
        )}
        {currentTab === "notifications" && (
          <NotificationCenter 
            emails={emails}
          />
        )}
        {currentTab === "voice" && <VoiceAssistant />}
        {currentTab === "notes" && (
          <NotesManager 
            notes={notes} 
            setNotes={setNotes} 
          />
        )}
      </main>
      
    </div>
  );
}
