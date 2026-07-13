import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Slack, 
  Github, 
  Mail, 
  Bookmark, 
  Sliders, 
  Trash2, 
  CheckCircle, 
  Sparkles, 
  AlertOctagon, 
  Send, 
  Clock, 
  Archive,
  RefreshCw,
  TrendingUp,
  MessageSquare,
  Compass
} from "lucide-react";
import { GmailMessage } from "../types";

interface NotificationCenterProps {
  emails: GmailMessage[];
}

interface NotificationItem {
  id: string;
  source: "slack" | "gmail" | "github" | "jira";
  title: string;
  sender: string;
  snippet: string;
  rawDate: string;
  timestamp: string;
  priority: "urgent" | "high" | "medium" | "low";
  score: number;
  isRead: boolean;
  actionDetails?: {
    type: "reply" | "review" | "ticket";
    placeholder: string;
    actionLabel: string;
  };
}

interface UserRule {
  id: string;
  keyword: string;
  effect: "boost_urgent" | "boost_high" | "demote_low";
  isActive: boolean;
}

export default function NotificationCenter({ emails }: NotificationCenterProps) {
  // 1. Initial State for User Rules
  const [rules, setRules] = useState<UserRule[]>(() => {
    const saved = localStorage.getItem("butler_prioritization_rules");
    return saved ? JSON.parse(saved) : [
      { id: "rule-1", keyword: "Boss", effect: "boost_urgent", isActive: true },
      { id: "rule-2", keyword: "blocker", effect: "boost_urgent", isActive: true },
      { id: "rule-3", keyword: "review", effect: "boost_high", isActive: true },
      { id: "rule-4", keyword: "newsletter", effect: "demote_low", isActive: true }
    ];
  });

  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleEffect, setNewRuleEffect] = useState<"boost_urgent" | "boost_high" | "demote_low">("boost_high");

  // 2. Learned Behavior Flags
  const [learnedBehaviorEnabled, setLearnedBehaviorEnabled] = useState(true);
  const [frequentSenders, setFrequentSenders] = useState<string[]>(["Kunle Bello", "Sarah Connor", "anasabubakar7000@gmail.com"]);

  // 3. Notifications list state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterSource, setFilterSource] = useState<"all" | "slack" | "gmail" | "github" | "jira">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "urgent" | "high" | "medium" | "low">("all");

  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [quickActionText, setQuickActionText] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Save rules
  useEffect(() => {
    localStorage.setItem("butler_prioritization_rules", JSON.stringify(rules));
    recalculatePriorities();
  }, [rules, learnedBehaviorEnabled, emails]);

  // Generate original baseline notifications (mixing mock notifications + actual Gmail inbox messages!)
  const generateBaselineNotifications = (): NotificationItem[] => {
    const rawMock: NotificationItem[] = [
      {
        id: "notif-slack-1",
        source: "slack",
        title: "Direct Message: Need Urgent Signoff",
        sender: "Kunle Bello",
        snippet: "Hey Boss, we need your digital signature on the budget proposal before 3:00 PM today so we can clear the bank wire. The vendor is waiting.",
        rawDate: new Date(Date.now() - 300000).toISOString(), // 5 mins ago
        timestamp: "5 mins ago",
        priority: "high",
        score: 80,
        isRead: false,
        actionDetails: {
          type: "reply",
          placeholder: "Type a Slack message...",
          actionLabel: "Send Quick Slack"
        }
      },
      {
        id: "notif-github-1",
        source: "github",
        title: "PR review requested: #481 Auth security update",
        sender: "GitHub Actions",
        snippet: "Boss, your review is requested on repository: workspace-hub-broker. 'Implement token refreshing routines to secure API endpoints'.",
        rawDate: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        timestamp: "30 mins ago",
        priority: "medium",
        score: 60,
        isRead: false,
        actionDetails: {
          type: "review",
          placeholder: "Leave feedback or code approval...",
          actionLabel: "Approve Pull Request"
        }
      },
      {
        id: "notif-jira-1",
        source: "jira",
        title: "BLOCKER Opened: Database Connection Leak",
        sender: "Sarah Connor (Jira)",
        snippet: "[JIRA-8902] Critical memory pool exhaustion in PostgreSQL. Container ingress failing with 503 Service Unavailable. Assigned to Database Core.",
        rawDate: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
        timestamp: "1 hr ago",
        priority: "high",
        score: 85,
        isRead: false,
        actionDetails: {
          type: "ticket",
          placeholder: "Add comment to Jira issue...",
          actionLabel: "Post Jira Comment"
        }
      },
      {
        id: "notif-slack-2",
        source: "slack",
        title: "Mention in #general: Q4 Operational Plan",
        sender: "Chidi Benson",
        snippet: "@Boss mentioned: I added the marketing brief. Can we get an initial review of the draft notes stored in the Memory panel?",
        rawDate: new Date(Date.now() - 7200000).toISOString(), // 2 hrs ago
        timestamp: "2 hrs ago",
        priority: "medium",
        score: 50,
        isRead: false,
        actionDetails: {
          type: "reply",
          placeholder: "Nudge team on Slack...",
          actionLabel: "Post in #general"
        }
      }
    ];

    // Combine with synced Google Workspace Gmail inbox messages
    const emailNotifs: NotificationItem[] = emails.map((mail, idx) => {
      return {
        id: `notif-gmail-${mail.id}`,
        source: "gmail",
        title: `Gmail: ${mail.subject}`,
        sender: mail.from,
        snippet: mail.snippet,
        rawDate: new Date(Date.now() - 3600000 * (idx + 3)).toISOString(),
        timestamp: mail.date,
        priority: "medium",
        score: 45,
        isRead: false,
        actionDetails: {
          type: "reply",
          placeholder: "Draft Gmail response...",
          actionLabel: "Send Quick Email"
        }
      };
    });

    return [...rawMock, ...emailNotifs];
  };

  // Run the Prioritization Algorithm
  const recalculatePriorities = () => {
    const baseList = notifications.length > 0 ? [...notifications] : generateBaselineNotifications();

    const scoredList = baseList.map(item => {
      let score = 50; // default baseline

      // 1. Base Score adjustments by source channels
      if (item.source === "jira") score += 10;   // Jira tasks are highly structured
      if (item.source === "slack") score += 15;  // Slack is real-time chat
      if (item.source === "github") score += 5;

      // 2. Apply Learned Behavior weightings
      if (learnedBehaviorEnabled) {
        const isFreq = frequentSenders.some(sender => 
          item.sender.toLowerCase().includes(sender.toLowerCase())
        );
        if (isFreq) {
          score += 20; // 20pt boost for frequent partners
        }
      }

      // 3. Apply User-Defined Custom Rules
      rules.forEach(rule => {
        if (!rule.isActive) return;

        const contentToSearch = `${item.title} ${item.sender} ${item.snippet}`.toLowerCase();
        const matches = contentToSearch.includes(rule.keyword.toLowerCase());

        if (matches) {
          if (rule.effect === "boost_urgent") {
            score += 35;
          } else if (rule.effect === "boost_high") {
            score += 15;
          } else if (rule.effect === "demote_low") {
            score -= 30;
          }
        }
      });

      // 4. Bound scores between 0 and 100
      score = Math.max(5, Math.min(99, score));

      // 5. Convert numeric score back to categorical Priority Tag
      let finalPriority: "urgent" | "high" | "medium" | "low" = "low";
      if (score >= 85) finalPriority = "urgent";
      else if (score >= 65) finalPriority = "high";
      else if (score >= 40) finalPriority = "medium";

      return {
        ...item,
        score,
        priority: finalPriority
      };
    });

    // Sort descending by calculated score
    scoredList.sort((a, b) => b.score - a.score);
    setNotifications(scoredList);
  };

  // Initialize notifications on first load
  useEffect(() => {
    recalculatePriorities();
  }, [emails]);

  // Refresh feed simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      recalculatePriorities();
      setIsRefreshing(false);
      setSuccessToast("Prioritized notifications feed successfully synced.");
      setTimeout(() => setSuccessToast(""), 3000);
    }, 1200);
  };

  // Add rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleKeyword.trim()) return;

    const newRule: UserRule = {
      id: "rule-" + Math.random().toString(36).substr(2, 9),
      keyword: newRuleKeyword.trim(),
      effect: newRuleEffect,
      isActive: true
    };

    setRules([...rules, newRule]);
    setNewRuleKeyword("");
    setSuccessToast(`Created new sorting rule for "${newRule.keyword}"`);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  // Toggle rule
  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  // Delete rule
  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  // Actions on notifications: Dismiss/Archive
  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    setSuccessToast("Notification archived.");
    setTimeout(() => setSuccessToast(""), 3000);
  };

  // Quick Action execution simulation
  const handleExecuteAction = (id: string, actionType: string) => {
    if (!quickActionText.trim()) return;

    // Simulate API calls
    setSuccessToast(`Executing integration request via ${actionType}...`);
    setTimeout(() => {
      // Archive/remove after actioned
      setNotifications(notifications.filter(n => n.id !== id));
      setActiveActionId(null);
      setQuickActionText("");
      setSuccessToast(`Action successful! Broadcast sent via pipeline.`);
      setTimeout(() => setSuccessToast(""), 4000);
    }, 1500);
  };

  const filteredNotifs = notifications.filter(item => {
    const matchesSource = filterSource === "all" || item.source === filterSource;
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    return matchesSource && matchesPriority;
  });

  return (
    <div id="notifications-workspace" className="p-8 max-w-7xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-6">
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white flex items-center gap-3">
            <Bell className="w-5 h-5 text-elegant-gold" />
            Workspace Notification Desk
          </h2>
          <p className="text-xs text-elegant-muted mt-1 font-sans">
            Unified priority inbox scanning live Slack, Gmail, GitHub, and Jira boards.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Priorities
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-elegant-gold/5 border border-elegant-gold/20 rounded-lg p-3 text-center text-xs text-elegant-gold animate-fade-in font-mono">
          ✨ {successToast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Prioritization Algorithm Controller (Left sidebar column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Section: Prioritizer Settings */}
          <div className="bg-elegant-card border border-elegant-border p-6 rounded-2xl shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-elegant-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-elegant-gold" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-white">Priority Engine</h3>
              </div>
              <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">V2 Algorithmic</span>
            </div>

            {/* Learned Behavior Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-medium">Smart Learned Weighting</span>
                <button
                  type="button"
                  onClick={() => setLearnedBehaviorEnabled(!learnedBehaviorEnabled)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    learnedBehaviorEnabled ? "bg-elegant-gold" : "bg-elegant-border"
                  }`}
                >
                  <div className={`w-4 h-4 bg-black rounded-full transition-transform ${
                    learnedBehaviorEnabled ? "translate-x-5" : "translate-x-0"
                  }`}></div>
                </button>
              </div>
              <p className="text-[10px] text-elegant-muted leading-relaxed">
                Automatically elevates senders/contacts with whom you collaborate most frequently (e.g. <strong>{frequentSenders.slice(0,2).join(", ")}</strong>).
              </p>
            </div>

            {/* Rules config list */}
            <div className="space-y-3 pt-3 border-t border-elegant-border/60">
              <span className="text-[10px] font-mono text-elegant-muted uppercase tracking-wider block">Keyword Sorting Rules</span>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between gap-2 p-2.5 bg-elegant-bg border border-elegant-border rounded-lg text-xs font-sans">
                    <div className="flex items-center gap-2 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={rule.isActive}
                        onChange={() => toggleRule(rule.id)}
                        className="rounded border-elegant-border text-elegant-gold focus:ring-elegant-gold/35"
                      />
                      <div className="truncate">
                        <span className="font-mono text-[11px] text-white font-semibold">"{rule.keyword}"</span>
                        <span className={`text-[9px] block font-mono capitalize ${
                          rule.effect === "boost_urgent" 
                            ? "text-red-400" 
                            : rule.effect === "boost_high" 
                              ? "text-elegant-gold" 
                              : "text-blue-400"
                        }`}>
                          {rule.effect.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="text-elegant-muted hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add rule form */}
            <form onSubmit={handleAddRule} className="space-y-3 pt-3 border-t border-elegant-border/60">
              <span className="text-[10px] font-mono text-elegant-muted uppercase tracking-wider block">Add Custom Sorter</span>
              
              <div className="space-y-2 text-xs">
                <input 
                  type="text" 
                  placeholder="Keyword (e.g. 'Meeting', 'Patch')" 
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2 rounded-lg text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                />
                
                <select
                  value={newRuleEffect}
                  onChange={(e: any) => setNewRuleEffect(e.target.value)}
                  className="w-full bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2 rounded-lg text-white focus:outline-none focus:border-elegant-border-light font-sans"
                >
                  <option value="boost_urgent">Escalate to URGENT (+35pts)</option>
                  <option value="boost_high">Boost to HIGH (+15pts)</option>
                  <option value="demote_low">Demote to LOW (-30pts)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer"
              >
                + Inject Rule
              </button>
            </form>
          </div>

        </div>

        {/* Unified Notifications Feed */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-elegant-card border border-elegant-border px-4 py-3 rounded-xl shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-elegant-muted uppercase mr-1">Source:</span>
              {(["all", "slack", "gmail", "github", "jira"] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setFilterSource(src)}
                  className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    filterSource === src 
                      ? "bg-elegant-gold/10 text-elegant-gold border border-elegant-gold/30" 
                      : "text-elegant-muted hover:text-white"
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] text-elegant-muted uppercase mr-1">Priority:</span>
              {(["all", "urgent", "high", "medium", "low"] as const).map(pri => (
                <button
                  key={pri}
                  onClick={() => setFilterPriority(pri)}
                  className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider transition-colors ${
                    filterPriority === pri 
                      ? "bg-white/10 text-white" 
                      : "text-elegant-muted hover:text-white"
                  }`}
                >
                  {pri}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Container */}
          <div className="space-y-3">
            {filteredNotifs.map((item) => {
              const isOpenAction = activeActionId === item.id;
              
              return (
                <div 
                  key={item.id}
                  className={`bg-elegant-card border rounded-xl p-5 shadow-sm transition-all duration-300 ${
                    item.priority === "urgent"
                      ? "border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.03)]"
                      : item.priority === "high"
                        ? "border-elegant-gold/25"
                        : "border-elegant-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Brand Icon wrapper */}
                      <div className={`p-2.5 rounded-lg border shrink-0 ${
                        item.source === "slack" 
                          ? "bg-purple-500/5 border-purple-500/20 text-purple-400"
                          : item.source === "gmail"
                            ? "bg-red-500/5 border-red-500/20 text-red-400"
                            : item.source === "github"
                              ? "bg-white/5 border-white/20 text-neutral-300"
                              : "bg-blue-500/5 border-blue-500/20 text-blue-400"
                      }`}>
                        {item.source === "slack" && <Slack className="w-4 h-4" />}
                        {item.source === "gmail" && <Mail className="w-4 h-4" />}
                        {item.source === "github" && <Github className="w-4 h-4" />}
                        {item.source === "jira" && <Bookmark className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            item.priority === "urgent"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : item.priority === "high"
                                ? "bg-elegant-gold/10 text-elegant-gold border border-elegant-gold/20"
                                : item.priority === "medium"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                                  : "bg-elegant-bg text-elegant-muted border border-elegant-border"
                          }`}>
                            {item.priority} (score: {item.score})
                          </span>
                          <span className="text-[10px] font-mono text-elegant-muted">from <strong>{item.sender}</strong></span>
                        </div>
                        <h4 className="text-xs font-semibold text-white tracking-wide font-sans">{item.title}</h4>
                        <p className="text-[11px] text-elegant-muted leading-relaxed font-sans">{item.snippet}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1.5">
                      <span className="text-[9px] font-mono text-elegant-dark block">{item.timestamp}</span>
                      <div className="flex gap-1.5 justify-end">
                        <button 
                          onClick={() => handleDismiss(item.id)}
                          className="p-1.5 bg-elegant-bg border border-elegant-border text-elegant-muted hover:text-white rounded hover:border-elegant-border-light cursor-pointer"
                          title="Archive Notification"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Container */}
                  {item.actionDetails && (
                    <div className="mt-4 pt-3 border-t border-elegant-border/40 space-y-3">
                      {!isOpenAction ? (
                        <div className="flex justify-end">
                          <button
                            onClick={() => setActiveActionId(item.id)}
                            className="px-3 py-1 bg-elegant-gold/5 border border-elegant-gold/20 text-elegant-gold hover:bg-elegant-gold/10 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                          >
                            ⚡ Fast-Act Interface
                          </button>
                        </div>
                      ) : (
                        <div className="bg-elegant-bg border border-elegant-border p-3.5 rounded-lg space-y-3 animate-fade-in">
                          <div className="flex justify-between items-center text-[9px] font-mono text-elegant-muted">
                            <span>INTEGRATION ACTION PORTAL ({item.source.toUpperCase()})</span>
                            <button 
                              onClick={() => setActiveActionId(null)}
                              className="text-red-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={quickActionText}
                              onChange={(e) => setQuickActionText(e.target.value)}
                              placeholder={item.actionDetails.placeholder}
                              className="flex-1 bg-elegant-card border border-elegant-border text-xs px-3.5 py-1.5 rounded-md text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
                            />
                            <button
                              onClick={() => handleExecuteAction(item.id, item.source)}
                              disabled={!quickActionText.trim()}
                              className="px-4 py-1.5 bg-elegant-gold text-neutral-950 font-bold text-[10px] font-mono uppercase tracking-wider rounded-md disabled:opacity-40 cursor-pointer"
                            >
                              {item.actionDetails.actionLabel}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredNotifs.length === 0 && (
              <div className="text-center py-20 border border-dashed border-elegant-border rounded-xl bg-elegant-card/5">
                <CheckCircle className="w-8 h-8 text-emerald-500/80 mx-auto mb-3" />
                <h4 className="text-xs font-mono uppercase tracking-widest text-elegant-muted">Inbox is pristine, Boss</h4>
                <p className="text-[11px] text-elegant-dark max-w-sm mx-auto mt-1 leading-relaxed">
                  No notifications matching your filtering parameters remain in the priority queues.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
