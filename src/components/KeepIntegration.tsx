import React, { useState, useEffect } from "react";
import { NotebookPen, Plus, Trash2, Pin, Search, CheckSquare, RefreshCw, Palette } from "lucide-react";
import { Note } from "../types";

interface KeepIntegrationProps {
  token: string | null;
}

export default function KeepIntegration({ token }: KeepIntegrationProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-elegant-card");
  const [isLoading, setIsLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"Demo Mode Active" | "Connected to Live Keep" | "Enterprise Fallback Active">("Enterprise Fallback Active");

  // Fetch Keep notes
  const fetchKeepNotes = async () => {
    if (!token) return;
    setIsLoading(true);

    if (token === "demo-access-token") {
      setSyncStatus("Demo Mode Active");
      const saved = localStorage.getItem("butler_google_keep_fallback");
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        const initial = getInitialFallbackNotes();
        setNotes(initial);
        localStorage.setItem("butler_google_keep_fallback", JSON.stringify(initial));
      }
      setIsLoading(false);
      return;
    }

    try {
      // Attempt to load from real Keep API
      const res = await fetch("https://keep.googleapis.com/v1/notes", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Enterprise authorization required or API disabled for non-workspace account");
      }

      const data = await res.json();
      setSyncStatus("Connected to Live Keep");
      if (data.notes && data.notes.length > 0) {
        const parsedNotes: Note[] = data.notes.map((item: any) => ({
          id: item.name,
          title: item.title || "Untitled Keep Note",
          content: item.body?.text?.text || "",
          updatedAt: new Date(item.updateTime || Date.now()).toLocaleDateString() + " " + new Date(item.updateTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: "bg-elegant-card border-elegant-border"
        }));
        setNotes(parsedNotes);
        localStorage.setItem("butler_google_keep_fallback", JSON.stringify(parsedNotes));
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.warn("Google Keep API returned error (expected for standard Google accounts). Falling back to local offline keep storage. Error:", err);
      setSyncStatus("Enterprise Fallback Active");
      const saved = localStorage.getItem("butler_google_keep_fallback");
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        const initial = getInitialFallbackNotes();
        setNotes(initial);
        localStorage.setItem("butler_google_keep_fallback", JSON.stringify(initial));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitialFallbackNotes = (): Note[] => [
    {
      id: "keep-1",
      title: "💡 Chief of Staff Directives",
      content: "- Review budget cells in Sheet\n- Confirm meeting brief details\n- Synchronize presentation boards",
      updatedAt: new Date().toLocaleDateString(),
      color: "border-elegant-gold/40 hover:border-elegant-gold/80"
    },
    {
      id: "keep-2",
      title: "⚠️ Q3 High Priority Deliverables",
      content: "- Deliver server.ts patch\n- Complete Google OAuth connections\n- Audit customer feedback surveys",
      updatedAt: new Date().toLocaleDateString(),
      color: "border-red-500/30 hover:border-red-500/60"
    }
  ];

  // Load notes on mount/token change
  useEffect(() => {
    fetchKeepNotes();
  }, [token]);

  const saveNotes = async (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem("butler_google_keep_fallback", JSON.stringify(updated));

    if (token && token !== "demo-access-token" && syncStatus === "Connected to Live Keep") {
      // Best-effort push to Google Keep API if connected
      try {
        const latestNote = updated[0];
        await fetch("https://keep.googleapis.com/v1/notes", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: latestNote.title,
            body: { text: { text: latestNote.content } }
          })
        });
      } catch (err) {
        console.error("Failed to sync note creation to Keep API:", err);
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const newNote: Note = {
      id: "keep-" + Date.now(),
      title: newTitle.trim() || "Untitled Note",
      content: newContent.trim(),
      updatedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: selectedColor
    };

    const updated = [newNote, ...notes];
    await saveNotes(updated);

    setNewTitle("");
    setNewContent("");
    setSelectedColor("bg-elegant-card");
  };

  const handleDeleteNote = async (id: string) => {
    const confirmed = window.confirm("Boss, do you want to remove this Keep note?");
    if (!confirmed) return;

    const filtered = notes.filter((note) => note.id !== id);
    setNotes(filtered);
    localStorage.setItem("butler_google_keep_fallback", JSON.stringify(filtered));

    if (token && token !== "demo-access-token" && syncStatus === "Connected to Live Keep" && id.startsWith("notes/")) {
      try {
        await fetch(`https://keep.googleapis.com/v1/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to delete note from Keep API:", err);
      }
    }
  };

  const colors = [
    { class: "bg-elegant-card border-elegant-border", name: "Default" },
    { class: "bg-amber-950/20 border-amber-500/30 text-amber-300", name: "Amber" },
    { class: "bg-emerald-950/20 border-emerald-500/30 text-emerald-300", name: "Emerald" },
    { class: "bg-red-950/20 border-red-500/30 text-red-300", name: "Crimson" },
    { class: "bg-blue-950/20 border-blue-500/30 text-blue-300", name: "Blue" },
    { class: "bg-purple-950/20 border-purple-500/30 text-purple-300", name: "Purple" }
  ];

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="keep-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-amber-500" />
            Google Keep Notes
          </h3>
          <p className="text-[11px] text-elegant-muted">Pin lists, categorize colors, and organize quick digital cards</p>
        </div>
        <span className={`text-[8px] font-mono border px-2 py-0.5 rounded uppercase tracking-wider ${
          syncStatus === "Connected to Live Keep"
            ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
            : syncStatus === "Demo Mode Active"
            ? "text-blue-400 bg-blue-500/5 border-blue-500/20"
            : "text-amber-400 bg-amber-500/5 border-amber-500/20"
        }`}>
          {syncStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Card */}
        <div className="space-y-4 text-left">
          <form onSubmit={handleAddNote} className="bg-elegant-card border border-elegant-border p-5 rounded-xl space-y-4">
            <h4 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest">New Digital Keep Card</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title..."
                className="w-full bg-elegant-bg border border-elegant-border px-3.5 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light font-sans font-medium"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Take a note, make a checklist, draft memos..."
                className="w-full bg-elegant-bg border border-elegant-border p-3 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light h-28 resize-none font-sans"
              />
            </div>

            {/* Color Palette selectors */}
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-elegant-muted uppercase tracking-wider">Select Note Accent Color:</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.class)}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-all border ${c.class} ${
                      selectedColor === c.class ? "ring-2 ring-elegant-gold ring-offset-2 ring-offset-elegant-bg" : ""
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Save Note Card
            </button>
          </form>
        </div>

        {/* Notes Board column grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-elegant-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter digital keep notes..."
              className="w-full bg-elegant-card border border-elegant-border pl-9 pr-4 py-2 rounded-lg text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-5 rounded-xl border flex flex-col justify-between text-left transition-all ${
                  note.color?.includes("border") ? note.color : `bg-elegant-card/40 border-elegant-border hover:border-elegant-border-light`
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="text-xs font-bold text-white font-sans">{note.title}</h4>
                    <Pin className="w-3.5 h-3.5 text-elegant-muted/60" />
                  </div>
                  <p className="text-xs text-elegant-text leading-relaxed whitespace-pre-wrap font-sans">
                    {note.content}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-elegant-border/40 font-mono text-[9px] text-elegant-muted">
                  <span>Saved: {note.updatedAt}</span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 hover:bg-red-500/10 text-elegant-dark hover:text-red-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-elegant-border rounded-xl font-mono text-[10px] text-elegant-muted uppercase tracking-wider">
                No matching digital keep cards, Boss.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
