import React from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Briefcase, 
  Mic, 
  NotebookPen, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Users,
  Bell
} from "lucide-react";
import { User } from "firebase/auth";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "home", label: "Command Center", icon: LayoutDashboard },
    { id: "chat", label: "AI Butler Chat", icon: MessageSquare },
    { id: "workspace", label: "Workspace Hub", icon: Briefcase },
    { id: "delegation", label: "Task Delegation", icon: Users },
    { id: "notifications", label: "Notification Desk", icon: Bell },
    { id: "voice", label: "Live Assistant", icon: Mic },
    { id: "notes", label: "Memory & Notes", icon: NotebookPen },
  ];

  return (
    <aside 
      id="butler-sidebar" 
      className="w-72 bg-elegant-bg border-r border-elegant-border flex flex-col justify-between h-screen text-elegant-text shrink-0"
    >
      {/* Top Section / Brand */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-elegant-gold/10 p-2.5 rounded-xl border border-elegant-gold/20 shadow-[0_0_10px_rgba(212,175,55,0.15)]">
            <Sparkles className="w-5 h-5 text-elegant-gold stroke-[1.5]" />
          </div>
          <div>
            <h1 className="text-xl font-light tracking-[0.15em] font-sans text-white italic">BUTLER</h1>
            <p className="text-[9px] uppercase tracking-[0.25em] font-mono text-elegant-gold font-medium">Digital Chief of Staff</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 group relative ${
                  isActive 
                    ? "bg-elegant-card text-elegant-gold border-l-2 border-elegant-gold shadow-[0_0_15px_rgba(212,175,55,0.05)]" 
                    : "text-elegant-muted hover:bg-elegant-card/50 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors duration-300 ${
                  isActive ? "text-elegant-gold" : "text-elegant-dark group-hover:text-elegant-muted"
                }`} />
                <span className="font-medium">{item.label}</span>
                
                {/* Gold Glow indicator for active tab */}
                {isActive && (
                  <span className="absolute right-4 w-1 h-1 bg-elegant-gold rounded-full animate-pulse shadow-[0_0_8px_#D4AF37]"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Section / Bottom */}
      <div className="p-5 border-t border-elegant-border">
        {user ? (
          <div className="flex items-center justify-between gap-3 p-3 bg-elegant-card rounded-lg border border-elegant-border">
            <div className="flex items-center gap-3 min-w-0">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "Boss"} 
                  className="w-8 h-8 rounded-full border border-elegant-border-light shrink-0" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-elegant-bg flex items-center justify-center border border-elegant-border text-white font-mono text-xs shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-elegant-muted" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[8px] font-mono text-elegant-gold uppercase tracking-widest">Active Boss</p>
                <h3 className="text-xs font-semibold text-white truncate font-sans">{user.displayName || "Boss"}</h3>
              </div>
            </div>
            <button 
              id="logout-btn"
              onClick={onLogout}
              className="p-2 text-elegant-muted hover:text-red-400 hover:bg-elegant-bg rounded-md transition-all duration-300"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-center p-3 text-[10px] text-elegant-muted font-mono tracking-wider uppercase">
            Secured Bridge Active
          </div>
        )}
      </div>
    </aside>
  );
}
