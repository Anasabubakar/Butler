import React, { useState, useEffect } from "react";
import { 
  Users, 
  Send, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  User, 
  Slack, 
  FileEdit,
  Play,
  ArrowRight,
  ShieldAlert,
  Bell,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Task, Contact } from "../types";

interface TaskDelegationProps {
  tasks: Task[];
  contacts: Contact[];
  onRefreshTasks?: () => void;
}

interface DelegatedTask {
  id: string;
  title: string;
  assignee: {
    name: string;
    email: string;
    service: "Slack" | "Asana" | "Jira";
    handle: string;
  };
  tool: "Slack" | "Asana" | "Jira";
  status: "pending" | "reminded" | "overdue" | "escalated" | "completed";
  assignedAt: string;
  dueDate: string;
  remindersSentCount: number;
  timeline: Array<{
    timestamp: string;
    type: "info" | "warning" | "error" | "success";
    message: string;
  }>;
}

export default function TaskDelegation({ tasks, contacts, onRefreshTasks }: TaskDelegationProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTaskTitle, setCustomTaskTitle] = useState<string>("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("0");
  const [selectedTool, setSelectedTool] = useState<"Slack" | "Asana" | "Jira">("Slack");
  const [dueDateStr, setDueDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [escalationThreshold, setEscalationThreshold] = useState<number>(2);
  const [delegatedList, setDelegatedList] = useState<DelegatedTask[]>(() => {
    const saved = localStorage.getItem("butler_delegated_tasks");
    return saved ? JSON.parse(saved) : [
      {
        id: "del-sample-1",
        title: "Synthesize Q3 Fiscal Audit Report",
        assignee: {
          name: "Kunle Bello",
          email: "kunle.bello@company.com",
          service: "Slack",
          handle: "@kunle"
        },
        tool: "Slack",
        status: "reminded",
        assignedAt: new Date(Date.now() - 3600000 * 25).toLocaleString(),
        dueDate: new Date(Date.now() - 3600000 * 2).toISOString().split("T")[0], // Overdue by 2 hours
        remindersSentCount: 1,
        timeline: [
          { timestamp: new Date(Date.now() - 3600000 * 25).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), type: "info", message: "Task delegated via Slack. Notification sent to @kunle" },
          { timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), type: "warning", message: "Task is overdue. Sent first automated gentle reminder to @kunle on Slack." }
        ]
      }
    ];
  });

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [actionLog, setActionLog] = useState<string>("");
  const [showAssignSuccess, setShowAssignSuccess] = useState(false);

  // Fallback preset team members if contacts are empty
  const presetTeamMembers: Array<{
    name: string;
    email: string;
    service: "Slack" | "Asana" | "Jira";
    handle: string;
  }> = [
    { name: "Kunle Bello", email: "kunle.bello@company.com", service: "Slack", handle: "@kunle" },
    { name: "Chidi Benson", email: "chidi.b@company.com", service: "Slack", handle: "@chidi_b" },
    { name: "Sarah Connor", email: "s.connor@asana.com", service: "Asana", handle: "Sarah C." },
    { name: "Grace Hopper", email: "g.hopper@asana.com", service: "Asana", handle: "Grace H." },
    { name: "Nnamdi Azikiwe", email: "nnamdi@jira.com", service: "Jira", handle: "Nnamdi" }
  ];

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("butler_delegated_tasks", JSON.stringify(delegatedList));
  }, [delegatedList]);

  // Handle Delegate Action
  const handleDelegate = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalTitle = "";
    if (selectedTaskId === "custom") {
      if (!customTaskTitle.trim()) {
        alert("Please enter a custom task name, Boss.");
        return;
      }
      finalTitle = customTaskTitle.trim();
    } else {
      const t = tasks.find(item => item.id === selectedTaskId);
      if (!t) {
        alert("Please select a task to delegate, Boss.");
        return;
      }
      finalTitle = t.title;
    }

    const assignee = presetTeamMembers[parseInt(selectedAssigneeId)];
    
    const newDelegation: DelegatedTask = {
      id: "del-" + Math.random().toString(36).substr(2, 9),
      title: finalTitle,
      assignee: {
        name: assignee.name,
        email: assignee.email,
        service: assignee.service as any,
        handle: assignee.handle
      },
      tool: selectedTool,
      status: "pending",
      assignedAt: new Date().toLocaleString(),
      dueDate: dueDateStr,
      remindersSentCount: 0,
      timeline: [
        { 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          type: "info", 
          message: `Task deployed successfully. Created ticket/message on ${selectedTool} assigned to ${assignee.name}.` 
        }
      ]
    };

    setDelegatedList([newDelegation, ...delegatedList]);
    setCustomTaskTitle("");
    setSelectedTaskId("");
    setShowAssignSuccess(true);
    setTimeout(() => setShowAssignSuccess(false), 4000);
  };

  // Simulate Status Check / Auto Reminder Trigger
  const runAutomatedAudit = () => {
    let updated = false;
    const newList = delegatedList.map(item => {
      // Check if due date is in the past and task is not completed
      const isPastDue = new Date(item.dueDate) < new Date() && item.status !== "completed";
      
      if (isPastDue) {
        updated = true;
        let newStatus = item.status;
        let newCount = item.remindersSentCount;
        const newTimeline = [...item.timeline];
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (item.status === "pending") {
          newStatus = "reminded";
          newCount = 1;
          newTimeline.push({
            timestamp: nowStr,
            type: "warning",
            message: `⚠️ System Audit: Task is overdue! Sent gentle automated reminder via ${item.tool} to ${item.assignee.handle}.`
          });
        } else if (item.status === "reminded") {
          newCount += 1;
          if (newCount >= escalationThreshold) {
            newStatus = "escalated";
            newTimeline.push({
              timestamp: nowStr,
              type: "error",
              message: `🚨 ESCALATION ENFORCED: Assignee ${item.assignee.handle} failed to respond after ${newCount} warnings. Alerted Boss.`
            });
          } else {
            newTimeline.push({
              timestamp: nowStr,
              type: "warning",
              message: `⚠️ System Audit: Still unresolved. Sent follow-up warning #${newCount} to ${item.assignee.handle}.`
            });
          }
        }

        return {
          ...item,
          status: newStatus,
          remindersSentCount: newCount,
          timeline: newTimeline
        };
      }
      return item;
    });

    if (updated) {
      setDelegatedList(newList);
      setActionLog("Butler's automated task crawler completed. Processed overdue records and applied escalations.");
    } else {
      setActionLog("Butler completed the workspace crawler. All delegated queues are current and within compliance thresholds.");
    }
    setTimeout(() => setActionLog(""), 5000);
  };

  // Simulate Manual Ping
  const triggerManualReminder = (id: string) => {
    const newList = delegatedList.map(item => {
      if (item.id === id) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newCount = item.remindersSentCount + 1;
        const isEscalating = newCount >= escalationThreshold;
        const newStatus = isEscalating ? "escalated" : "reminded";
        
        const newTimeline = [...item.timeline, {
          timestamp: nowStr,
          type: isEscalating ? "error" as const : "warning" as const,
          message: isEscalating 
            ? `🚨 Manual Push: Reminders exceeded threshold of ${escalationThreshold}. ESCALATED to Boss.`
            : `🔔 Manual nudge deployed to ${item.assignee.name} via ${item.tool}: "Hi ${item.assignee.handle}, quick follow up on '${item.title}'."`
        }];

        return {
          ...item,
          status: newStatus as any,
          remindersSentCount: newCount,
          timeline: newTimeline
        };
      }
      return item;
    });
    setDelegatedList(newList);
  };

  // Complete a Delegated Task
  const completeDelegatedTask = (id: string) => {
    const newList = delegatedList.map(item => {
      if (item.id === id) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          ...item,
          status: "completed" as const,
          timeline: [...item.timeline, {
            timestamp: nowStr,
            type: "success" as const,
            message: `✅ Task marked as COMPLETED by assignee in ${item.tool}. Closed ticket.`
          }]
        };
      }
      return item;
    });
    setDelegatedList(newList);
  };

  // Reset/Clear Delegation
  const deleteDelegation = (id: string) => {
    setDelegatedList(delegatedList.filter(item => item.id !== id));
  };

  return (
    <div id="task-delegation-workspace" className="p-8 max-w-7xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-6">
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white flex items-center gap-3">
            <Users className="w-5 h-5 text-elegant-gold" />
            Smart Task Delegation
          </h2>
          <p className="text-xs text-elegant-muted mt-1 font-sans">
            Delegate workspace targets to your team over Slack or Asana. Let Butler monitor status, dispatch warnings, and escalate delays automatically.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={runAutomatedAudit}
            className="flex items-center gap-2 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Audit Status Queues
          </button>
        </div>
      </div>

      {actionLog && (
        <div className="bg-elegant-gold/5 border border-elegant-gold/20 rounded-lg p-3 text-center text-xs text-elegant-gold animate-fade-in font-mono">
          ✨ {actionLog}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* delegation form */}
        <div className="lg:col-span-1 bg-elegant-card border border-elegant-border p-6 rounded-2xl shadow-md h-fit space-y-5">
          <div className="flex items-center gap-2 border-b border-elegant-border/60 pb-3 mb-1">
            <Sparkles className="w-4 h-4 text-elegant-gold" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-white">Create Delegation Block</h3>
          </div>

          {showAssignSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-mono text-center">
              ✓ Assignment successfully pushed to integration queues!
            </div>
          )}

          <form onSubmit={handleDelegate} className="space-y-4">
            {/* Task selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Select Target Task</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2.5 rounded-lg text-white focus:outline-none focus:border-elegant-border-light font-sans"
              >
                <option value="">-- Choose a Workspace Task --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
                <option value="custom">+ Assign custom task...</option>
              </select>
            </div>

            {selectedTaskId === "custom" && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Custom Task Name</label>
                <input
                  type="text"
                  placeholder="Review business decks, draft briefs..."
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2.5 rounded-lg text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
              </div>
            )}

            {/* Team Member Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Assignee Team Member</label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2.5 rounded-lg text-white focus:outline-none focus:border-elegant-border-light font-sans"
              >
                {presetTeamMembers.map((m, idx) => (
                  <option key={idx} value={idx}>{m.name} ({m.service})</option>
                ))}
              </select>
            </div>

            {/* Service Dispatch Platform */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Dispatch Integration Tool</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Slack", "Asana", "Jira"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTool(t)}
                    className={`px-3 py-2 border rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${
                      selectedTool === t 
                        ? "border-elegant-gold bg-elegant-gold/5 text-elegant-gold" 
                        : "border-elegant-border text-elegant-muted hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Execution Deadline</label>
              <input
                type="date"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-elegant-border-light font-mono"
              />
            </div>

            {/* Escalation Config */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-elegant-muted">Escalation Trigger Threshold</label>
                <span className="text-[10px] font-mono text-elegant-gold">{escalationThreshold} Reminders</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={escalationThreshold}
                onChange={(e) => setEscalationThreshold(parseInt(e.target.value))}
                className="w-full h-1 bg-elegant-border rounded-lg appearance-none cursor-pointer accent-elegant-gold"
              />
              <p className="text-[9px] text-elegant-muted italic">Butler will alert Boss directly if assignee remains non-compliant after this limit.</p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-elegant-gold hover:bg-elegant-gold/90 text-neutral-950 font-bold text-xs rounded-lg uppercase tracking-widest transition-all duration-300 shadow-[0_4px_12px_rgba(212,175,55,0.15)] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Deploy & Monitor
            </button>
          </form>
        </div>

        {/* Monitors Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 border-b border-elegant-border w-fit pb-px">
              <button 
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === "active" ? "border-elegant-gold text-elegant-gold" : "border-transparent text-elegant-muted hover:text-white"
                }`}
              >
                Active Pipelines ({delegatedList.filter(i => i.status !== "completed").length})
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === "history" ? "border-elegant-gold text-elegant-gold" : "border-transparent text-elegant-muted hover:text-white"
                }`}
              >
                Completed & History ({delegatedList.filter(i => i.status === "completed").length})
              </button>
            </div>
            
            <button 
              onClick={() => {
                const isOverdue = new Date(dueDateStr) < new Date();
                const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const mockOverdue: DelegatedTask = {
                  id: "del-" + Math.random().toString(36).substr(2, 9),
                  title: "Deploy API Security Patch",
                  assignee: presetTeamMembers[0],
                  tool: "Slack",
                  status: "pending",
                  assignedAt: new Date(Date.now() - 3600000 * 5).toLocaleString(),
                  dueDate: new Date(Date.now() - 3600000).toISOString().split("T")[0], // overdue
                  remindersSentCount: 0,
                  timeline: [
                    { timestamp: nowStr, type: "info", message: "Task initialized via Slack thread." }
                  ]
                };
                setDelegatedList([mockOverdue, ...delegatedList]);
                setActionLog("Injected mock overdue pipeline. Run 'Audit Status Queues' to watch Butler auto-remind and escalate!");
              }}
              className="text-[9px] font-mono text-elegant-muted hover:text-elegant-gold transition-colors uppercase tracking-widest border border-elegant-border px-2 py-1 rounded"
            >
              + Quick Overdue Simulation
            </button>
          </div>

          <div className="space-y-4">
            {delegatedList
              .filter(item => activeTab === "active" ? item.status !== "completed" : item.status === "completed")
              .map((item) => {
                const isOverdue = new Date(item.dueDate) < new Date() && item.status !== "completed";
                return (
                  <div 
                    key={item.id}
                    className={`bg-elegant-card border rounded-xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
                      item.status === "escalated" 
                        ? "border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]" 
                        : item.status === "reminded"
                          ? "border-elegant-gold/30"
                          : "border-elegant-border"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            item.status === "escalated"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : item.status === "reminded"
                                ? "bg-elegant-gold/10 text-elegant-gold border-elegant-gold/20"
                                : "bg-elegant-bg text-elegant-muted border-elegant-border"
                          }`}>
                            {item.status === "escalated" ? "🚨 Escalated" : item.status === "reminded" ? "⚠️ Warning Out" : "✓ Active Monitoring"}
                          </span>
                          <span className="text-[10px] font-mono text-elegant-muted">via <strong>{item.tool}</strong></span>
                        </div>
                        <h4 className="text-sm font-semibold text-white tracking-wide font-sans">{item.title}</h4>
                      </div>

                      <button 
                        onClick={() => deleteDelegation(item.id)}
                        className="text-[10px] font-mono text-elegant-muted hover:text-red-400 cursor-pointer"
                      >
                        Release Pipeline
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-elegant-bg rounded-lg border border-elegant-border text-[11px] font-sans">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-elegant-muted uppercase block">Assignee</span>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-elegant-gold" />
                          <span className="text-white font-medium">{item.assignee.name}</span>
                          <span className="text-[10px] text-elegant-muted font-mono">({item.assignee.handle})</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-elegant-muted uppercase block">Due Date</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3 h-3 ${isOverdue ? "text-red-400" : "text-elegant-muted"}`} />
                          <span className={isOverdue ? "text-red-400 font-bold" : "text-elegant-text"}>
                            {item.dueDate} {isOverdue && "(Overdue)"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-elegant-muted uppercase block">Reminders Sent</span>
                        <div className="flex items-center gap-1.5">
                          <Bell className="w-3 h-3 text-elegant-muted" />
                          <span className="text-white">{item.remindersSentCount} of {escalationThreshold} before Escalation</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Log */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-elegant-muted uppercase tracking-wider block">Pipeline Activity Log</span>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto bg-elegant-bg/40 border border-elegant-border/60 p-3 rounded-lg">
                        {item.timeline.map((log, lIdx) => (
                          <div key={lIdx} className="flex gap-2 text-[10px] leading-relaxed">
                            <span className="text-elegant-dark font-mono shrink-0">[{log.timestamp}]</span>
                            <span className={
                              log.type === "error" 
                                ? "text-red-400 font-medium" 
                                : log.type === "warning" 
                                  ? "text-elegant-gold" 
                                  : log.type === "success" 
                                    ? "text-emerald-400" 
                                    : "text-elegant-muted"
                            }>
                              {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Controls */}
                    {item.status !== "completed" && (
                      <div className="pt-2 border-t border-elegant-border/40 flex flex-wrap justify-between items-center gap-3">
                        <p className="text-[10px] text-elegant-muted italic">
                          Last sync check: Just now.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => triggerManualReminder(item.id)}
                            className="px-3 py-1.5 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            ⚡ Send Reminder Nudge
                          </button>
                          <button
                            onClick={() => completeDelegatedTask(item.id)}
                            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            ✓ Mark Resolved
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {delegatedList.filter(item => activeTab === "active" ? item.status !== "completed" : item.status === "completed").length === 0 && (
              <div className="text-center py-20 border border-dashed border-elegant-border rounded-xl bg-elegant-card/5">
                <CheckCircle2 className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
                <h4 className="text-xs font-mono uppercase tracking-widest text-elegant-muted">No delegated tasks found</h4>
                <p className="text-[11px] text-elegant-dark max-w-sm mx-auto mt-1 leading-relaxed">
                  {activeTab === "active" 
                    ? "Choose a workspace target on the left panel, and delegate tasks to begin live tracking." 
                    : "No completed assignments stored in this pipeline archive."}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
