import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ListTodo, 
  Mail, 
  Sparkles, 
  Car, 
  MapPin, 
  Layers, 
  Notebook, 
  CheckCircle, 
  Clock, 
  Navigation,
  RefreshCw
} from "lucide-react";
import { CalendarEvent, GmailMessage, Task, Note, RouteOption } from "../types";

interface HomeDashboardProps {
  user: any;
  events: CalendarEvent[];
  tasks: Task[];
  emails: GmailMessage[];
  notes: Note[];
  isLoadingWorkspace: boolean;
  onRefreshWorkspace: () => void;
}

export default function HomeDashboard({ 
  user, 
  events, 
  tasks, 
  emails, 
  notes, 
  isLoadingWorkspace, 
  onRefreshWorkspace 
}: HomeDashboardProps) {
  const [transitFrom, setTransitFrom] = useState("Ikeja");
  const [transitTo, setTransitTo] = useState("Lekki");
  const [transitOptions, setTransitOptions] = useState<RouteOption[]>([]);
  const [isSearchingTransit, setIsSearchingTransit] = useState(false);
  
  const [aiRecommendations, setAiRecommendations] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Focus of the Day
  const [focusInput, setFocusInput] = useState("");
  const [focusList, setFocusList] = useState<string[]>(() => {
    const saved = localStorage.getItem("butler_focus_list");
    return saved ? JSON.parse(saved) : [
      "Prepare event schedules for the Boss",
      "Check pending approvals on Google Drive",
      "Draft standard operating procedures"
    ];
  });

  useEffect(() => {
    localStorage.setItem("butler_focus_list", JSON.stringify(focusList));
  }, [focusList]);

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusInput.trim()) return;
    setFocusList([...focusList, focusInput.trim()]);
    setFocusInput("");
  };

  const handleRemoveFocus = (index: number) => {
    setFocusList(focusList.filter((_, i) => i !== index));
  };

  // Nigeria transit recommendations
  const handleTransitSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchingTransit(true);
    
    try {
      // Prompt Gemini to give us realistic local transport advice for Lagos/Nigeria
      const prompt = `Provide 4 realistic transport routing options from '${transitFrom}' to '${transitTo}' in Nigeria. 
      Map these to specific Nigeria transport types: 
      1. 'danfo' (Lagos Yellow Minibus)
      2. 'brt' (Bus Rapid Transit)
      3. 'maruwa' or 'keke' (Tricycle)
      4. 'okada' (Motorcycle) or 'uber' (Ride hailing).
      For each option, provide:
      - The type of transport.
      - A realistic duration (e.g. '1h 15m' or '45 mins' accounting for traffic).
      - Estimated cost in Naira (₦) (e.g. '₦1,200').
      - A short, specific visual route description (e.g., 'Take BRT from Ikeja Underbridge to Fadeyi, transfer to local Danfo').
      
      Respond with a JSON array matching this exact schema:
      [{ "type": "brt", "name": "Lagos BRT Corridor", "duration": "1h 10m", "cost": "₦800", "description": "Board the Blue BRT from Ikeja terminal to CMS, then take a quick connection." }]
      Return ONLY valid JSON and nothing else.`;

      const response = await fetch("/api/butler/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: prompt }],
          mode: "low-latency"
        })
      });

      const data = await response.json();
      
      try {
        // Strip markdown blocks if present
        let cleanedText = data.text.trim();
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.substring(7, cleanedText.length - 3);
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.substring(3, cleanedText.length - 3);
        }
        const parsed = JSON.parse(cleanedText.trim());
        setTransitOptions(parsed);
      } catch (err) {
        // Fallback transit options
        setTransitOptions([
          { type: "brt", name: "BRT Shuttle", duration: "1h 20m", cost: "₦1,000", description: "Take BRT from Ikeja Bus Terminal to TBS, change for Lekki." },
          { type: "danfo", name: "Danfo Bus", duration: "1h 45m", cost: "₦1,500", description: "Yellow Danfo bus from Ikeja along to Oshodi, connect to Obalende/Lekki." },
          { type: "uber", name: "Hailing Car / Uber", duration: "1h 10m", cost: "₦9,500", description: "Private ride via Third Mainland Bridge. Expect typical toll gate traffic." },
          { type: "keke", name: "Maruwa Connection", duration: "45m", cost: "₦600", description: "Local Maruwa shuttles for short bypass links through traffic bottlenecks." }
        ]);
      }
    } catch (error) {
      console.error("Transit routing failed:", error);
    } finally {
      setIsSearchingTransit(false);
    }
  };

  // Generate Proactive Recommendations using Gemini
  const generateRecommendations = async () => {
    setIsGeneratingAi(true);
    try {
      const contextPrompt = `Analyze today's schedule, emails, tasks, and notes to prepare a comprehensive "Chief of Staff briefing" for Boss. 
      Here is the raw workspace data:
      - TODAY'S MEETINGS: ${JSON.stringify(events)}
      - PENDING TASKS: ${JSON.stringify(tasks)}
      - UNREAD/RECENT EMAILS: ${JSON.stringify(emails)}
      - RECENT MEMORIES & NOTES: ${JSON.stringify(notes)}
      
      Write exactly 3 or 4 brief, executive-level, highly specific recommendations. Be proactive. 
      Examples: "detect scheduling conflicts and recommend a solution", "notice overdue tasks and suggest prioritizations", "identify important emails awaiting response and recommend a drafted reply", "suggest automation opportunities".
      Always address the user directly as 'Boss'. Do not use robotic intro text. Write clean, elegant markdown with clear headings.`;

      const response = await fetch("/api/butler/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: contextPrompt }],
          mode: "general"
        })
      });

      const data = await response.json();
      setAiRecommendations(data.text);
    } catch (err) {
      console.error("Recommendations generation failed:", err);
      setAiRecommendations("I apologize, Boss. I encountered an error while synthesizing your morning brief.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    if (events.length > 0 || tasks.length > 0 || emails.length > 0) {
      generateRecommendations();
    } else {
      setAiRecommendations(
        "Welcome back, Boss. Connect your Google Workspace using the **Workspace Hub** tab, and I will analyze your emails, schedule, and tasks to synthesize customized recommendations right here."
      );
    }
  }, [events, tasks, emails]);

  return (
    <div id="home-dashboard" className="p-8 max-w-7xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text font-sans">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-elegant-card p-6 rounded-2xl border border-elegant-border shadow-md">
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white">
            Good morning, <span className="text-elegant-gold italic font-medium">Boss</span>.
          </h2>
          <p className="text-xs text-elegant-muted mt-1 font-sans">
            All systems are active. Your digital command is secure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            id="refresh-workspace-btn"
            onClick={onRefreshWorkspace}
            disabled={isLoadingWorkspace}
            className="flex items-center gap-2 px-4 py-2 bg-elegant-bg hover:bg-elegant-card border border-elegant-border hover:border-elegant-border-light rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all duration-300 text-elegant-muted hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWorkspace ? "animate-spin text-elegant-gold" : ""}`} />
            Sync Workspace
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: AI Proactive Briefing (Large Span) */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-elegant-gold/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div>
            <div className="flex items-center justify-between border-b border-elegant-border/60 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-elegant-gold/10 border border-elegant-gold/20 rounded-lg">
                  <Sparkles className="w-4 h-4 text-elegant-gold" />
                </div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-white">Chief of Staff Brief</h3>
              </div>
              <button 
                onClick={generateRecommendations}
                disabled={isGeneratingAi}
                className="text-[9px] uppercase font-mono tracking-widest text-elegant-gold hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isGeneratingAi ? "Synthesizing..." : "Recalculate"}
              </button>
            </div>

            {isGeneratingAi ? (
              <div className="space-y-3 py-6">
                <div className="h-3 bg-elegant-bg border border-elegant-border/45 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-elegant-bg border border-elegant-border/45 rounded animate-pulse w-5/6"></div>
                <div className="h-3 bg-elegant-bg border border-elegant-border/45 rounded animate-pulse w-2/3"></div>
                <p className="text-[10px] font-mono text-elegant-muted text-center pt-2">Analyzing schedule for conflicts & priorities...</p>
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-elegant-text prose prose-invert max-w-none font-sans py-2 whitespace-pre-wrap">
                {aiRecommendations}
              </div>
            )}
          </div>
          
          <div className="border-t border-elegant-border/40 pt-4 mt-4 flex items-center justify-between text-[10px] text-elegant-muted">
            <span className="font-mono">Routing Core: Gemini Pro & Flash</span>
            <span className="flex items-center gap-1.5 font-mono text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Proactive Mode Online
            </span>
          </div>
        </div>

        {/* Widget 2: Today's Focus (Personal Goals) */}
        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-6 shadow-md flex flex-col h-full">
          <div className="flex items-center gap-3 border-b border-elegant-border/60 pb-4 mb-4">
            <div className="p-2 bg-elegant-bg border border-elegant-border rounded-lg">
              <ListTodo className="w-4 h-4 text-elegant-muted" />
            </div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-white">Today's Focus</h3>
          </div>

          <form onSubmit={handleAddFocus} className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="What must be done, Boss?" 
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              className="flex-1 bg-elegant-bg border border-elegant-border text-xs px-3.5 py-2 rounded-lg text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-elegant-gold text-neutral-950 hover:bg-elegant-gold/90 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {focusList.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between gap-3 p-3 bg-elegant-bg rounded-lg border border-elegant-border hover:border-elegant-border-light transition-all duration-350 group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[10px] font-mono text-elegant-gold mt-0.5">0{index + 1}</span>
                  <p className="text-xs text-elegant-text font-sans">{item}</p>
                </div>
                <button 
                  onClick={() => handleRemoveFocus(index)}
                  className="text-elegant-muted hover:text-red-400 text-[10px] font-mono px-1 py-0.5 rounded transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ))}
            {focusList.length === 0 && (
              <div className="text-center py-8 text-[10px] text-elegant-muted font-mono uppercase tracking-wider">
                No active focus list.
              </div>
            )}
          </div>
        </div>

        {/* Widget 3: Live Workspace Pulse (Metrics) */}
        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 border-b border-elegant-border/60 pb-4 mb-4">
            <div className="p-2 bg-elegant-bg border border-elegant-border rounded-lg">
              <Layers className="w-4 h-4 text-elegant-muted" />
            </div>
            <h3 className="text-sm font-mono uppercase tracking-wider text-white">Workspace Health</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-elegant-bg rounded-lg border border-elegant-border flex flex-col justify-between h-24">
              <span className="text-[9px] text-elegant-muted font-mono uppercase tracking-wider">Meetings</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-light text-white font-mono">{events.length}</span>
                <Calendar className="w-3.5 h-3.5 text-elegant-gold" />
              </div>
            </div>
            <div className="p-4 bg-elegant-bg rounded-lg border border-elegant-border flex flex-col justify-between h-24">
              <span className="text-[9px] text-elegant-muted font-mono uppercase tracking-wider">Inbox</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-light text-white font-mono">{emails.length}</span>
                <Mail className="w-3.5 h-3.5 text-elegant-gold" />
              </div>
            </div>
            <div className="p-4 bg-elegant-bg rounded-lg border border-elegant-border flex flex-col justify-between h-24">
              <span className="text-[9px] text-elegant-muted font-mono uppercase tracking-wider">Google Tasks</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-light text-white font-mono">{tasks.length}</span>
                <CheckCircle className="w-3.5 h-3.5 text-elegant-gold" />
              </div>
            </div>
            <div className="p-4 bg-elegant-bg rounded-lg border border-elegant-border flex flex-col justify-between h-24">
              <span className="text-[9px] text-elegant-muted font-mono uppercase tracking-wider">Saved Notes</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-light text-white font-mono">{notes.length}</span>
                <Notebook className="w-3.5 h-3.5 text-elegant-gold" />
              </div>
            </div>
          </div>
        </div>

        {/* Widget 4: Nigeria Transit Hub */}
        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-6 shadow-md lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-elegant-border/60 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-elegant-gold/10 border border-elegant-gold/20 rounded-lg">
                <Car className="w-4 h-4 text-elegant-gold" />
              </div>
              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-white">Lagos Transit Routing</h3>
                <p className="text-[8px] text-elegant-muted font-mono tracking-widest">DANFO, BRT, MARUWA, KEKE, OKADA, HAILING</p>
              </div>
            </div>
            
            <form onSubmit={handleTransitSearch} className="flex gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-elegant-bg border border-elegant-border px-2 py-1 rounded-lg">
                <input 
                  type="text" 
                  value={transitFrom}
                  onChange={(e) => setTransitFrom(e.target.value)}
                  placeholder="From"
                  className="w-16 bg-transparent text-[11px] text-white focus:outline-none placeholder-elegant-dark text-center font-mono"
                />
                <span className="text-elegant-dark text-xs font-mono">→</span>
                <input 
                  type="text" 
                  value={transitTo}
                  onChange={(e) => setTransitTo(e.target.value)}
                  placeholder="To"
                  className="w-16 bg-transparent text-[11px] text-white focus:outline-none placeholder-elegant-dark text-center font-mono"
                />
              </div>
              <button 
                type="submit"
                disabled={isSearchingTransit}
                className="px-3 py-1.5 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3 text-elegant-gold" />
                Route
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isSearchingTransit ? (
              <div className="col-span-2 py-8 text-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-elegant-gold mx-auto" />
                <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-wider">Computing route options, mapping Danfo & BRT links...</p>
              </div>
            ) : transitOptions.length > 0 ? (
              transitOptions.map((opt, i) => (
                <div key={i} className="p-4 bg-elegant-bg border border-elegant-border rounded-xl hover:border-elegant-border-light transition-all duration-350 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-elegant-gold px-2 py-0.5 bg-elegant-gold/5 border border-elegant-gold/10 rounded">
                        {opt.type}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-elegant-muted">
                        <Clock className="w-3 h-3 text-elegant-dark" />
                        <span>{opt.duration}</span>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wide font-sans">{opt.name}</h4>
                    <p className="text-[11px] text-elegant-muted leading-relaxed line-clamp-2">{opt.description}</p>
                  </div>
                  {opt.cost && (
                    <div className="mt-3 pt-2 border-t border-elegant-border/40 flex justify-between items-center text-[10px] font-mono text-elegant-muted">
                      <span className="uppercase tracking-wider">Est. fare</span>
                      <span className="text-elegant-gold font-bold">{opt.cost}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center border border-dashed border-elegant-border rounded-xl bg-elegant-bg/25">
                <MapPin className="w-5 h-5 text-elegant-dark mx-auto mb-2" />
                <p className="text-[10px] text-elegant-muted font-mono uppercase tracking-widest">Enter locations above to get optimal local transit routes.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
