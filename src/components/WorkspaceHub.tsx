import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Mail, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  HardDrive, 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  Clock, 
  ExternalLink, 
  User as UserIcon,
  RefreshCw,
  Send,
  PlusCircle,
  FileText,
  Sparkles,
  AlertOctagon,
  CheckCircle,
  FileSpreadsheet,
  Presentation,
  ClipboardList,
  NotebookPen,
  GraduationCap,
  Video,
  FolderOpen,
  MessageSquare
} from "lucide-react";
import { CalendarEvent, GmailMessage, Task, DriveFile, Contact } from "../types";

// Workspace Integration Component Imports
import SheetsIntegration from "./SheetsIntegration";
import DocsIntegration from "./DocsIntegration";
import SlidesIntegration from "./SlidesIntegration";
import ChatIntegration from "./ChatIntegration";
import FormsIntegration from "./FormsIntegration";
import KeepIntegration from "./KeepIntegration";
import MeetIntegration from "./MeetIntegration";
import ClassroomIntegration from "./ClassroomIntegration";
import PickerIntegration from "./PickerIntegration";

interface WorkspaceHubProps {
  token: string | null;
  events: CalendarEvent[];
  tasks: Task[];
  emails: GmailMessage[];
  driveFiles: DriveFile[];
  contacts: Contact[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function WorkspaceHub({
  token,
  events,
  tasks,
  emails,
  driveFiles,
  contacts,
  isLoading,
  onRefresh
}: WorkspaceHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    | "gmail"
    | "calendar"
    | "tasks"
    | "drive"
    | "contacts"
    | "meeting-prep"
    | "sheets"
    | "docs"
    | "slides"
    | "chat"
    | "forms"
    | "keep"
    | "meet"
    | "classroom"
    | "picker"
  >("gmail");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Meeting Prep Simulation States
  const [simulatedOffset, setSimulatedOffset] = useState<number>(35);
  const [meetingsList, setMeetingsList] = useState<CalendarEvent[]>(events);
  const [selectedMeeting, setSelectedMeeting] = useState<CalendarEvent | null>(null);
  const [briefNarrative, setBriefNarrative] = useState("");
  const [isSynthesizingBrief, setIsSynthesizingBrief] = useState(false);

  useEffect(() => {
    if (events && events.length > 0) {
      setMeetingsList(events);
      if (!selectedMeeting) {
        setSelectedMeeting(events[0]);
      }
    }
  }, [events]);

  const handleInjectMockMeeting = () => {
    const mock: CalendarEvent = {
      id: "mock-meeting-1",
      summary: "Q3 Operational Roadmap Alignment",
      start: new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      end: new Date(Date.now() + 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: "Review milestones, cross-channel deliverables, and draft operational notes with Kunle and Sarah.",
      location: "Virtual Boardroom / Teams"
    };
    setMeetingsList([mock, ...meetingsList]);
    setSelectedMeeting(mock);
  };

  const generateBriefNarrative = async () => {
    if (!selectedMeeting) return;
    setIsSynthesizingBrief(true);
    try {
      const prompt = `Synthesize an elegant, highly specific cross-channel chief of staff briefing for the Boss's upcoming meeting: "${selectedMeeting.summary}".
      Description/Agenda: ${selectedMeeting.description || "No agenda details."}
      Attendees: Kunle Bello, Sarah Connor, Grace Hopper.
      Relevant Docs Gathered: Q3 Fiscal Projections, Executive Roadmap Board (Notion), Vendor Contract Draft (Outlook).
      Past Emails: Alignment on budget caps, fiscal schedules.
      
      Provide a highly customized executive summary of the meeting's objective, list of attendees with suspected organizational roles, background context pulled from emails, and a proactive check of relevant documents with suggested action items for the Boss during the meeting. Always address the user directly as 'Boss'. Do not write robotic introductions. Use markdown.`;

      const response = await fetch("/api/butler/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: prompt }],
          mode: "low-latency"
        })
      });

      const data = await response.json();
      setBriefNarrative(data.text);
    } catch (err) {
      console.error("Narrative synthesis failed:", err);
      setBriefNarrative("I apologize, Boss. I encountered an error while synthesizing your meeting brief packet.");
    } finally {
      setIsSynthesizingBrief(false);
    }
  };

  const harvestedDocs = [
    { name: "Q3 Fiscal Projections.xlsx", source: "Drive" },
    { name: "Executive Roadmap Board", source: "Notion" },
    { name: "Vendor Contract Draft.pdf", source: "Outlook" }
  ];

  const harvestedEmails = [
    { sender: "Kunle Bello", senderEmail: "kunle.bello@company.com", subject: "Re: Fiscal Audit Schedule", snippet: "Hi Boss, I reviewed the timelines you sent and aligned with accounting...", date: "Yesterday" },
    { sender: "Sarah Connor", senderEmail: "s.connor@asana.com", subject: "Budget alignment concerns", snippet: "Drafting the requested Asana boards. We need clarification on the cap limits...", date: "2 days ago" }
  ];
  
  // Modal states
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [eventSummary, setEventSummary] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventDuration, setEventDuration] = useState("30");
  const [eventDescription, setEventDescription] = useState("");
  const [isSchedulingEvent, setIsSchedulingEvent] = useState(false);

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [isCreatingTaskState, setIsCreatingTaskState] = useState(false);

  // Email Reader State
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

  if (!token) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto space-y-4 font-sans">
        <div className="bg-elegant-card border border-elegant-border p-8 rounded-xl shadow-lg">
          <Briefcase className="w-12 h-12 text-elegant-dark mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-light tracking-wide text-white mb-2 italic">Workspace Connection Inactive</h3>
          <p className="text-xs text-elegant-muted leading-relaxed font-sans">
            Boss, please complete the Google Sign-In secure authentication flow in the primary layout to link Gmail, Google Calendar, Google Tasks, Google Drive, and Contacts directly into your Chief of Staff platform.
          </p>
        </div>
      </div>
    );
  }

  // Gmail Sender (Safe URL Base64 constructing)
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) return;

    const confirmed = window.confirm(
      `Confirm with Boss: Send email to '${composeTo}' with subject '${composeSubject}'?`
    );
    if (!confirmed) return;

    setIsSendingEmail(true);
    try {
      // Craft basic RFC 822 Email Message
      const emailContent = [
        `To: ${composeTo}`,
        `Subject: ${composeSubject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        "",
        composeBody
      ].join("\n");

      const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64EncodedEmail })
      });

      if (!res.ok) throw new Error("Failed to deliver email");
      
      alert("Email sent successfully, Boss.");
      setShowCompose(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      onRefresh();
    } catch (err: any) {
      console.error("Email send error:", err);
      alert("Failed to send email: " + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Calendar Event Scheduler
  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventSummary || !eventStart) return;

    const confirmed = window.confirm(
      `Confirm with Boss: Schedule event '${eventSummary}' on ${new Date(eventStart).toLocaleString()}?`
    );
    if (!confirmed) return;

    setIsSchedulingEvent(true);
    try {
      const startTime = new Date(eventStart);
      const endTime = new Date(startTime.getTime() + parseInt(eventDuration) * 60 * 1000);

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: eventSummary,
          description: eventDescription,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() }
        })
      });

      if (!res.ok) throw new Error("Failed to insert event");

      alert("Calendar event scheduled, Boss.");
      setShowSchedule(false);
      setEventSummary("");
      setEventStart("");
      setEventDescription("");
      onRefresh();
    } catch (err: any) {
      console.error("Calendar scheduling error:", err);
      alert("Failed to schedule event: " + err.message);
    } finally {
      setIsSchedulingEvent(false);
    }
  };

  // Google Tasks Creator
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    const confirmed = window.confirm(`Confirm with Boss: Create task '${taskTitle}' in Google Tasks?`);
    if (!confirmed) return;

    setIsCreatingTaskState(true);
    try {
      // Fetch default tasklist ID first
      const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listsData = await listsRes.json();
      const defaultListId = listsData.items?.[0]?.id || "@default";

      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: taskTitle,
          due: taskDue ? new Date(taskDue).toISOString() : undefined
        })
      });

      if (!res.ok) throw new Error("Failed to insert task");

      alert("Task created in Google Tasks, Boss.");
      setShowCreateTask(false);
      setTaskTitle("");
      setTaskDue("");
      onRefresh();
    } catch (err: any) {
      console.error("Task creation failed:", err);
      alert("Failed to create task: " + err.message);
    } finally {
      setIsCreatingTaskState(false);
    }
  };

  // Google Tasks Completer (Patch Status)
  const handleCompleteTask = async (task: Task) => {
    const confirmed = window.confirm(`Confirm with Boss: Mark task '${task.title}' as completed?`);
    if (!confirmed) return;

    try {
      // Find list ID first
      const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listsData = await listsRes.json();
      const defaultListId = listsData.items?.[0]?.id || "@default";

      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: task.id,
          status: "completed"
        })
      });

      if (!res.ok) throw new Error("Failed to patch task");

      alert("Task marked complete, Boss.");
      onRefresh();
    } catch (err: any) {
      console.error("Task complete failed:", err);
      alert("Failed to update task: " + err.message);
    }
  };

  // Google Drive File Deletion
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`WARNING: Are you absolutely sure you want to delete '${fileName}' from Google Drive? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete file");

      alert("File successfully deleted from Google Drive, Boss.");
      onRefresh();
    } catch (err: any) {
      console.error("File deletion error:", err);
      alert("Failed to delete file: " + err.message);
    }
  };

  // Filtering based on search query
  const filteredEmails = emails.filter(e => 
    e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.from.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter(e => 
    e.summary.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="workspace-hub" className="p-8 max-w-7xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text font-sans">
      
      {/* Header and Sync */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-6">
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-elegant-gold" />
            Connected Workspace Console
          </h2>
          <p className="text-xs text-elegant-muted mt-1 font-sans">
            Real-time direct read/write pipelines via your secure Google OAuth session.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Universal Sub-Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-elegant-dark" />
            <input 
              type="text" 
              placeholder={`Search ${activeSubTab}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 bg-elegant-card border border-elegant-border px-9 py-1.5 rounded-lg text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
            />
          </div>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 bg-elegant-card hover:bg-elegant-bg border border-elegant-border hover:border-elegant-border-light rounded-lg text-elegant-muted hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-elegant-border overflow-x-auto pb-px gap-1 scrollbar-thin scrollbar-thumb-elegant-border scrollbar-track-transparent">
        <button
          onClick={() => { setActiveSubTab("gmail"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "gmail" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Gmail
        </button>
        <button
          onClick={() => { setActiveSubTab("calendar"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "calendar" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          Calendar
        </button>
        <button
          onClick={() => { setActiveSubTab("tasks"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "tasks" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Tasks
        </button>
        <button
          onClick={() => { setActiveSubTab("drive"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "drive" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Drive
        </button>
        <button
          onClick={() => { setActiveSubTab("sheets"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "sheets" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          Sheets
        </button>
        <button
          onClick={() => { setActiveSubTab("docs"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "docs" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          Docs
        </button>
        <button
          onClick={() => { setActiveSubTab("slides"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "slides" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <Presentation className="w-3.5 h-3.5 text-orange-400" />
          Slides
        </button>
        <button
          onClick={() => { setActiveSubTab("chat"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "chat" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
          Chat
        </button>
        <button
          onClick={() => { setActiveSubTab("forms"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "forms" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
          Forms
        </button>
        <button
          onClick={() => { setActiveSubTab("keep"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "keep" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <NotebookPen className="w-3.5 h-3.5 text-amber-400" />
          Keep Notes
        </button>
        <button
          onClick={() => { setActiveSubTab("meet"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "meet" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <Video className="w-3.5 h-3.5 text-rose-400" />
          Meet
        </button>
        <button
          onClick={() => { setActiveSubTab("classroom"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "classroom" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
          Classroom
        </button>
        <button
          onClick={() => { setActiveSubTab("picker"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "picker" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          Picker Browser
        </button>
        <button
          onClick={() => { setActiveSubTab("contacts"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "contacts" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Contacts Connection
        </button>
        <button
          onClick={() => { setActiveSubTab("meeting-prep"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-[10px] font-mono uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "meeting-prep" ? "border-elegant-gold text-elegant-gold bg-elegant-card/40" : "border-transparent text-elegant-muted hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-elegant-gold" />
          Proactive Meeting Prep
        </button>
      </div>

      {/* Subtab Contents */}
      <div className="space-y-4">
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-elegant-gold mx-auto mb-2" />
            <p className="text-[10px] text-elegant-muted font-mono uppercase tracking-wider">Synchronizing live Google API cache...</p>
          </div>
        )}

        {/* Live Workspace Integrations */}
        {!isLoading && activeSubTab === "sheets" && (
          <SheetsIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "docs" && (
          <DocsIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "slides" && (
          <SlidesIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "chat" && (
          <ChatIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "forms" && (
          <FormsIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "keep" && (
          <KeepIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "meet" && (
          <MeetIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "classroom" && (
          <ClassroomIntegration token={token} />
        )}
        {!isLoading && activeSubTab === "picker" && (
          <PickerIntegration token={token} />
        )}

        {/* Gmail Subtab */}
        {!isLoading && activeSubTab === "gmail" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Inbox Highlights</h3>
              <button 
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-2 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Compose Draft
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mail list */}
              <div className="md:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredEmails.map((msg) => (
                  <div 
                    key={msg.id}
                    onClick={() => setSelectedEmail(msg)}
                    className={`p-4 border rounded-xl cursor-pointer text-left transition-all duration-300 ${
                      selectedEmail?.id === msg.id 
                        ? "bg-elegant-card border-elegant-gold shadow-[0_0_12px_rgba(212,175,55,0.03)]" 
                        : "bg-elegant-card/40 border-elegant-border hover:border-elegant-border-light"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h4 className="text-xs font-bold text-white truncate max-w-[120px] font-sans">{msg.from}</h4>
                      <span className="text-[9px] font-mono text-elegant-muted shrink-0">{msg.date}</span>
                    </div>
                    <h5 className="text-xs text-elegant-gold font-semibold truncate mb-1">{msg.subject}</h5>
                    <p className="text-[11px] text-elegant-muted line-clamp-2 leading-relaxed">{msg.snippet}</p>
                  </div>
                ))}
                {filteredEmails.length === 0 && (
                  <div className="text-center py-10 font-mono text-[10px] text-elegant-muted uppercase tracking-wider border border-dashed border-elegant-border rounded-xl">
                    No matching emails in local inbox cache, Boss.
                  </div>
                )}
              </div>

              {/* Reader panel */}
              <div className="md:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-6 min-h-[400px] flex flex-col justify-between">
                {selectedEmail ? (
                  <div className="space-y-4">
                    <div className="border-b border-elegant-border/60 pb-4">
                      <span className="text-[8px] font-mono text-elegant-gold uppercase tracking-widest bg-elegant-gold/5 border border-elegant-gold/15 px-2 py-0.5 rounded">INBOX MESSAGE DETECTOR</span>
                      <h3 className="text-lg font-light tracking-wide text-white mt-2.5 italic font-sans">{selectedEmail.subject}</h3>
                      <div className="flex flex-wrap justify-between text-[11px] text-elegant-muted mt-2 gap-2">
                        <span>From: <strong className="text-white font-medium">{selectedEmail.from}</strong></span>
                        <span className="font-mono">{selectedEmail.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-elegant-text leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedEmail.body || selectedEmail.snippet || "No body content loaded for this email."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center my-auto py-12 text-elegant-muted">
                    <Mail className="w-8 h-8 mx-auto text-elegant-dark mb-3" />
                    <p className="text-xs font-mono uppercase tracking-wider">Select an email snippet to decrypt and read full body.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Subtab */}
        {!isLoading && activeSubTab === "calendar" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest font-medium">Boss's Schedule</h3>
              <button 
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Schedule Meeting
              </button>
            </div>

            <div className="space-y-2.5 max-w-4xl">
              {filteredEvents.map((evt) => (
                <div key={evt.id} className="p-4 bg-elegant-card border border-elegant-border hover:border-elegant-border-light rounded-xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-elegant-bg border border-elegant-border rounded-xl shrink-0 mt-0.5">
                      <CalendarIcon className="w-4 h-4 text-elegant-gold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans">{evt.summary}</h4>
                      {evt.description && <p className="text-[11px] text-elegant-muted mt-1 leading-normal">{evt.description}</p>}
                      {evt.location && <p className="text-[10px] text-elegant-dark mt-1 font-mono">Location: {evt.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-elegant-muted bg-elegant-bg px-3.5 py-1.5 rounded-lg border border-elegant-border self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5 text-elegant-dark" />
                    <span>{evt.start} - {evt.end}</span>
                  </div>
                </div>
              ))}
              {filteredEvents.length === 0 && (
                <div className="text-center py-20 font-mono text-[10px] text-elegant-muted uppercase tracking-wider border border-dashed border-elegant-border rounded-xl">
                  Your agenda is empty today, Boss. Live high-level briefings will trigger here once items are scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Subtab */}
        {!isLoading && activeSubTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest font-medium">Google Tasks Core</h3>
              <button 
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
              </button>
            </div>

            <div className="space-y-2.5 max-w-3xl">
              {filteredTasks.map((tsk) => (
                <div 
                  key={tsk.id} 
                  className="p-4 bg-elegant-card border border-elegant-border rounded-xl hover:border-elegant-border-light transition-all duration-300 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <input 
                      type="checkbox" 
                      checked={tsk.status === "completed"}
                      onChange={() => handleCompleteTask(tsk)}
                      className="w-4 h-4 rounded border-elegant-border bg-elegant-bg text-elegant-gold focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans">{tsk.title}</h4>
                      {tsk.due && <p className="text-[10px] text-elegant-muted mt-1 font-mono">Due: {new Date(tsk.due).toLocaleDateString()}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center py-20 font-mono text-[10px] text-elegant-muted uppercase tracking-wider border border-dashed border-elegant-border rounded-xl">
                  No pending Google Tasks on list, Boss. Clean registry.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drive Subtab */}
        {!isLoading && activeSubTab === "drive" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest font-medium">Google Drive browser</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 bg-elegant-card border border-elegant-border hover:border-elegant-border-light rounded-xl transition-all duration-300 flex flex-col justify-between h-36">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-elegant-gold shrink-0" />
                      <h4 className="text-xs font-bold text-white truncate max-w-[180px] font-sans">{file.name}</h4>
                    </div>
                    <p className="text-[9px] text-elegant-muted font-mono uppercase truncate mb-1">Mime: {file.mimeType.split(".").pop()}</p>
                    <p className="text-[9px] text-elegant-dark font-mono">Modified: {new Date(file.modifiedTime).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-elegant-border/40">
                    {file.webViewLink ? (
                      <a 
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] text-elegant-gold hover:text-white font-mono uppercase tracking-wider"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Drive
                      </a>
                    ) : (
                      <span className="text-[9px] text-elegant-dark font-mono">No link</span>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      className="text-elegant-muted hover:text-red-400 p-1 rounded hover:bg-elegant-bg"
                      title="Delete from Google Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="col-span-3 text-center py-20 font-mono text-[10px] text-elegant-muted uppercase tracking-wider border border-dashed border-elegant-border rounded-xl">
                  No matching files located in your Google Drive, Boss.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Connection */}
        {!isLoading && activeSubTab === "contacts" && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest font-medium">Connection Directory</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact, i) => (
                <div key={i} className="p-4 bg-elegant-card border border-elegant-border rounded-xl flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-elegant-bg border border-elegant-border flex items-center justify-center text-elegant-gold font-bold shrink-0">
                    <UserIcon className="w-3.5 h-3.5 text-elegant-muted" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate font-sans">{contact.name}</h4>
                    {contact.email && <p className="text-[11px] text-elegant-muted truncate mt-0.5 font-sans">{contact.email}</p>}
                    {contact.phone && <p className="text-[9px] text-elegant-dark font-mono mt-0.5">{contact.phone}</p>}
                  </div>
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <div className="col-span-3 text-center py-20 font-mono text-[10px] text-elegant-muted uppercase tracking-wider border border-dashed border-elegant-border rounded-xl">
                  No matched connections in profile cache directory, Boss.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proactive Meeting Prep */}
        {!isLoading && activeSubTab === "meeting-prep" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-4">
              <div>
                <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest font-medium">Proactive Briefing Compiler</h3>
                <p className="text-xs text-elegant-muted font-sans mt-0.5">Butler harvests relevant material and alerts you 30 minutes before every meeting.</p>
              </div>
              
              {/* Simulation Offset slider */}
              <div className="bg-elegant-card border border-elegant-border px-4 py-2 rounded-xl text-xs flex items-center gap-3 w-full sm:w-auto shadow-sm">
                <span className="font-mono text-[10px] uppercase text-elegant-muted whitespace-nowrap">Simulated Time Until Meeting:</span>
                <input 
                  type="range" 
                  min="5" 
                  max="60" 
                  value={simulatedOffset} 
                  onChange={(e) => setSimulatedOffset(parseInt(e.target.value))}
                  className="w-24 h-1 bg-elegant-border rounded-lg appearance-none cursor-pointer accent-elegant-gold"
                />
                <span className="font-mono text-elegant-gold font-bold">{simulatedOffset} mins</span>
              </div>
            </div>

            {/* Simulated 30-minute proactive warning banner */}
            {simulatedOffset <= 30 && selectedMeeting && (
              <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3.5 animate-pulse shadow-md">
                <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-red-400 font-mono uppercase tracking-wider">🚨 Proactive Briefing Triggered (Starts in {simulatedOffset} minutes!)</h4>
                  <p className="text-elegant-muted leading-relaxed font-sans">
                    Boss, your upcoming meeting <strong>"{selectedMeeting.summary}"</strong> starts in {simulatedOffset} minutes. I have automatically harvested your briefing packet below from Google Drive, Outlook, Notion, and Gmail.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Meetings List */}
              <div className="md:col-span-1 space-y-3">
                <span className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest block">Upcoming Calendar Matches</span>
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {meetingsList.map((evt) => {
                    const isSelected = selectedMeeting?.id === evt.id;
                    return (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedMeeting(evt);
                          setBriefNarrative("");
                        }}
                        className={`p-4 border rounded-xl cursor-pointer text-left transition-all duration-300 ${
                          isSelected 
                            ? "bg-elegant-card border-elegant-gold shadow-md scale-[0.98]" 
                            : "bg-elegant-card/40 border-elegant-border hover:border-elegant-border-light"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="text-xs font-bold text-white truncate font-sans">{evt.summary}</h4>
                          <span className="text-[9px] font-mono text-elegant-gold bg-elegant-gold/5 px-2 py-0.5 rounded border border-elegant-gold/10 shrink-0">
                            {evt.start}
                          </span>
                        </div>
                        <p className="text-[11px] text-elegant-muted truncate font-sans">{evt.description || "No agenda details logged."}</p>
                        <div className="mt-3 pt-2 border-t border-elegant-border/30 flex justify-between text-[9px] font-mono text-elegant-dark">
                          <span>HARVEST STATE: READY</span>
                          <span>-30m TRIGGER ACTIVE</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {meetingsList.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-elegant-border rounded-xl">
                      <p className="text-xs text-elegant-muted font-mono uppercase tracking-wider mb-3">No active meetings scheduled</p>
                      <button 
                        onClick={handleInjectMockMeeting}
                        className="px-3 py-1.5 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all cursor-pointer"
                      >
                        + Inject Mock Meeting
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Harvest Dashboard & Brief Packet */}
              <div className="md:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-6 min-h-[450px] flex flex-col justify-between">
                {selectedMeeting ? (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="border-b border-elegant-border/60 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[8px] font-mono text-elegant-gold uppercase tracking-widest bg-elegant-gold/5 border border-elegant-gold/15 px-2 py-0.5 rounded">HARVESTED EXECUTIVE BRIEF</span>
                        <h3 className="text-lg font-light tracking-wide text-white mt-2 italic font-sans">{selectedMeeting.summary}</h3>
                        <div className="flex gap-4 text-[11px] text-elegant-muted mt-2 font-mono">
                          <span>Time: <strong className="text-white">{selectedMeeting.start} - {selectedMeeting.end}</strong></span>
                          <span>Location: <strong className="text-white">{selectedMeeting.location || "Virtual Boardroom"}</strong></span>
                        </div>
                      </div>
                      <button
                        onClick={generateBriefNarrative}
                        disabled={isSynthesizingBrief}
                        className="px-3 py-1.5 bg-elegant-gold text-neutral-950 font-bold text-[10px] font-mono uppercase tracking-wider rounded-lg hover:bg-elegant-gold/90 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                      >
                        {isSynthesizingBrief ? "Synthesizing Brief..." : "⚡ Butler AI Synthesize"}
                      </button>
                    </div>

                    {/* AI narrative */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-elegant-muted uppercase tracking-wider block">Meeting Objective & Narrative</span>
                      {isSynthesizingBrief ? (
                        <div className="space-y-2 py-3 bg-elegant-bg/40 border border-elegant-border p-4 rounded-lg">
                          <div className="h-3 bg-elegant-border/45 rounded animate-pulse w-3/4"></div>
                          <div className="h-3 bg-elegant-border/45 rounded animate-pulse w-5/6"></div>
                          <div className="h-3 bg-elegant-border/45 rounded animate-pulse w-2/3"></div>
                        </div>
                      ) : briefNarrative ? (
                        <div className="text-xs text-elegant-text leading-relaxed whitespace-pre-wrap bg-elegant-bg/40 border border-elegant-border/60 p-4 rounded-lg font-sans">
                          {briefNarrative}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-elegant-bg/30 border border-dashed border-elegant-border rounded-lg text-xs text-elegant-muted">
                          Click "Butler AI Synthesize" to run cross-channel cognitive synthesis on attendees and files.
                        </div>
                      )}
                    </div>

                    {/* Integrated Harvester Status cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-elegant-bg border border-elegant-border rounded-lg text-[11px]">
                        <span className="text-[8px] font-mono text-elegant-gold block uppercase mb-1">Google Drive</span>
                        <div className="flex items-center gap-1 text-white font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          2 Files Harvested
                        </div>
                      </div>
                      <div className="p-3 bg-elegant-bg border border-elegant-border rounded-lg text-[11px]">
                        <span className="text-[8px] font-mono text-[#0078d4] block uppercase mb-1">Outlook Exchange</span>
                        <div className="flex items-center gap-1 text-white font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          1 Email Thread
                        </div>
                      </div>
                      <div className="p-3 bg-elegant-bg border border-elegant-border rounded-lg text-[11px]">
                        <span className="text-[8px] font-mono text-[#f59e0b] block uppercase mb-1">Notion Workspace</span>
                        <div className="flex items-center gap-1 text-white font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          1 Workspace Board
                        </div>
                      </div>
                    </div>

                    {/* Two-Column Files and Thread list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Gathered Documents */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-elegant-muted uppercase tracking-wider block">Harvested Files</span>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                          {harvestedDocs.map((doc, dIdx) => (
                            <div key={dIdx} className="p-2.5 bg-elegant-bg border border-elegant-border rounded-lg flex items-center justify-between text-xs">
                              <div className="min-w-0 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-elegant-gold shrink-0" />
                                <span className="text-white font-medium truncate">{doc.name}</span>
                              </div>
                              <span className="text-[8px] font-mono text-elegant-dark uppercase border border-elegant-border px-1.5 py-0.5 rounded shrink-0">{doc.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Past Email Threads */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-elegant-muted uppercase tracking-wider block">Past Email Threads</span>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto font-sans">
                          {harvestedEmails.map((email, eIdx) => (
                            <div key={eIdx} className="p-2.5 bg-elegant-bg border border-elegant-border rounded-lg text-[11px] space-y-0.5 text-left">
                              <div className="flex justify-between font-mono text-[9px] text-elegant-gold">
                                <span>{email.sender}</span>
                                <span>{email.date}</span>
                              </div>
                              <h5 className="text-white font-medium truncate">{email.subject}</h5>
                              <p className="text-elegant-muted line-clamp-1">{email.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center my-auto py-16 text-elegant-muted">
                    <Sparkles className="w-10 h-10 mx-auto text-elegant-dark mb-4 animate-pulse" />
                    <h3 className="text-sm font-light text-white mb-1 italic">No Selected Briefing</h3>
                    <p className="text-xs text-elegant-muted max-w-sm mx-auto font-sans leading-relaxed">
                      Select an upcoming meeting from the index column to harvest files and generate cognitive briefings.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Compose Draft Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSendEmail} className="bg-elegant-card border border-elegant-border rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center border-b border-elegant-border/60 pb-3">
              <h3 className="text-sm font-light tracking-wide text-white italic">Compose Email Draft</h3>
              <button 
                type="button" 
                onClick={() => setShowCompose(false)}
                className="text-elegant-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">To (Email)</label>
                <input 
                  type="email" 
                  required
                  placeholder="recipient@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter email subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Body</label>
                <textarea 
                  rows={6}
                  required
                  placeholder="Compose your message to Boss's exact specifications..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light resize-none font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-elegant-border/60">
              <button 
                type="button"
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-elegant-muted hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSendingEmail}
                className="flex items-center gap-2 px-5 py-2.5 bg-elegant-gold text-neutral-950 font-bold text-xs rounded-lg hover:bg-elegant-gold/90 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isSendingEmail ? "Sending..." : "Send Email"}
                <Send className="w-3 h-3 stroke-[2]" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleScheduleEvent} className="bg-elegant-card border border-elegant-border rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center border-b border-elegant-border/60 pb-3">
              <h3 className="text-sm font-light tracking-wide text-white italic">Schedule Calendar Event</h3>
              <button 
                type="button" 
                onClick={() => setShowSchedule(false)}
                className="text-elegant-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Event Summary (Title)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Design Review Meeting"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Start Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Duration</label>
                  <select 
                    value={eventDuration}
                    onChange={(e) => setEventDuration(e.target.value)}
                    className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-elegant-border-light font-sans"
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="90">1.5 Hours</option>
                    <option value="120">2 Hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Description / Agenda</label>
                <textarea 
                  rows={4}
                  placeholder="Notes, link to video rooms, or agendas..."
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light resize-none font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-elegant-border/60">
              <button 
                type="button"
                onClick={() => setShowSchedule(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-elegant-muted hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSchedulingEvent}
                className="flex items-center gap-2 px-5 py-2.5 bg-elegant-gold text-neutral-950 font-bold text-xs rounded-lg hover:bg-elegant-gold/90 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isSchedulingEvent ? "Scheduling..." : "Schedule Event"}
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTask} className="bg-elegant-card border border-elegant-border rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-elegant-border/60 pb-3">
              <h3 className="text-sm font-light tracking-wide text-white italic">Create Google Task</h3>
              <button 
                type="button" 
                onClick={() => setShowCreateTask(false)}
                className="text-elegant-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Task Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="Initialize code repository"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-elegant-muted uppercase tracking-widest mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-elegant-border/60">
              <button 
                type="button"
                onClick={() => setShowCreateTask(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-elegant-muted hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isCreatingTaskState}
                className="flex items-center gap-2 px-5 py-2.5 bg-elegant-gold text-neutral-950 font-bold text-xs rounded-lg hover:bg-elegant-gold/90 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isCreatingTaskState ? "Creating..." : "Create Task"}
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
