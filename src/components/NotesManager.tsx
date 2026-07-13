import React, { useState, useEffect } from "react";
import { 
  NotebookPen, 
  Plus, 
  Trash2, 
  Sparkles, 
  Search, 
  Save, 
  FileText, 
  Palette,
  Clock,
  RefreshCw,
  X
} from "lucide-react";
import { Note } from "../types";

interface NotesManagerProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

export default function NotesManager({ notes, setNotes }: NotesManagerProps) {
  const [search, setSearch] = useState("");
  
  // Edit note state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("charcoal");

  // AI assistant summary state
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const colors = [
    { id: "charcoal", label: "Slate Noir", bg: "bg-elegant-card border-elegant-border", hex: "#0F0F0F" },
    { id: "amber", label: "Imperial Gold", bg: "bg-elegant-card border-elegant-gold/30", hex: "#D4AF37" },
    { id: "blue", label: "Steel Blue", bg: "bg-elegant-card border-blue-500/25", hex: "#3b82f6" },
    { id: "emerald", label: "Emerald", bg: "bg-elegant-card border-emerald-500/25", hex: "#10b981" },
    { id: "violet", label: "Amethyst", bg: "bg-elegant-card border-violet-500/25", hex: "#8b5cf6" },
  ];

  // Add new blank note
  const handleCreateNote = () => {
    const newNote: Note = {
      id: Math.random().toString(),
      title: "Untitled Memory Block",
      content: "",
      updatedAt: new Date().toLocaleString(),
      color: "charcoal"
    };
    
    const updated = [newNote, ...notes];
    setNotes(updated);
    handleSelectNote(newNote);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color || "charcoal");
    setAiAnalysis("");
  };

  // Save changes to current note
  const handleSaveNote = () => {
    if (!selectedNote) return;

    const updated = notes.map(n => {
      if (n.id === selectedNote.id) {
        return {
          ...n,
          title: noteTitle.trim() || "Untitled Memory Block",
          content: noteContent,
          color: noteColor,
          updatedAt: new Date().toLocaleString()
        };
      }
      return n;
    });

    setNotes(updated);
    
    // Update selected ref
    setSelectedNote({
      ...selectedNote,
      title: noteTitle.trim() || "Untitled Memory Block",
      content: noteContent,
      color: noteColor,
      updatedAt: new Date().toLocaleString()
    });
  };

  // Delete note
  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to permanently delete this note, Boss?");
    if (!confirmed) return;

    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setNoteTitle("");
      setNoteContent("");
    }
  };

  // Trigger Gemini AI Summary for current Note
  const handleAiSummarize = async () => {
    if (!noteContent.trim()) {
      alert("Please enter some note contents first, Boss.");
      return;
    }

    setIsAnalyzing(true);
    setShowAiModal(true);
    try {
      const prompt = `Inspect the following note titled '${noteTitle}' and summarize its core actions, dates, key takeaways, and details for Boss.
      Note content:
      ${noteContent}
      
      Respond directly, address the user as 'Boss'. Do not write unhelpful introductory texts. Format beautifully in Markdown.`;

      const res = await fetch("/api/butler/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: prompt }],
          mode: "general"
        })
      });

      const data = await res.json();
      setAiAnalysis(data.text);
    } catch (err) {
      console.error("AI summarization failed:", err);
      setAiAnalysis("I apology, Boss. I was unable to complete the synthesis of this memory block.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const activeColorBg = colors.find(c => c.id === noteColor)?.bg || "bg-elegant-card border-elegant-border";

  return (
    <div id="notes-manager" className="p-8 max-w-7xl mx-auto space-y-8 bg-elegant-bg min-h-screen text-elegant-text font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-elegant-border pb-6">
        <div>
          <h2 className="text-2xl font-light tracking-wide text-white flex items-center gap-3">
            <NotebookPen className="w-5 h-5 text-elegant-gold" />
            Butler Keep & Memory
          </h2>
          <p className="text-xs text-elegant-muted mt-1 font-sans">
            Secure client-side offline persistence. Organize thoughts and synthesize briefings.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Note Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-elegant-dark" />
            <input 
              type="text" 
              placeholder="Search memory..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-48 bg-elegant-card border border-elegant-border px-9 py-1.5 rounded-lg text-xs text-white placeholder-elegant-dark focus:outline-none focus:border-elegant-border-light font-sans"
            />
          </div>
          <button 
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-4 py-2 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Notes Grid Column */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Memory Blocks ({filteredNotes.length})</h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const noteColorBg = colors.find(c => c.id === note.color)?.bg || "bg-elegant-card border-elegant-border";
              const isSelected = selectedNote?.id === note.id;
              
              return (
                <div 
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 border rounded-xl cursor-pointer text-left transition-all duration-300 ${noteColorBg} ${
                    isSelected ? "ring-2 ring-elegant-gold/50 border-elegant-gold scale-[0.98] shadow-[0_0_15px_rgba(212,175,55,0.03)]" : "hover:border-elegant-border-light"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h4 className="text-xs font-bold text-white truncate font-sans">{note.title}</h4>
                    <button 
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="text-elegant-muted hover:text-red-400 p-1 rounded hover:bg-elegant-bg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-elegant-muted line-clamp-3 leading-relaxed mb-3 font-sans">
                    {note.content || "Empty note. Add details..."}
                  </p>
                  <div className="flex items-center gap-1 text-[9px] text-elegant-dark font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{note.updatedAt}</span>
                  </div>
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <div className="text-center py-16 border border-dashed border-elegant-border rounded-xl bg-elegant-card/10 text-elegant-muted font-mono text-[10px] uppercase tracking-wider">
                Memory blocks are empty, Boss. Click "New Note" to catalog plans.
              </div>
            )}
          </div>
        </div>

        {/* Note Editor Column */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className={`border rounded-xl p-6 space-y-6 transition-all duration-300 shadow-md ${activeColorBg}`}>
              
              {/* Toolbar */}
              <div className="flex justify-between items-center border-b border-elegant-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-elegant-muted" />
                  <span className="text-[9px] font-mono text-elegant-muted uppercase tracking-widest">ACTIVE MEMORY COMPILER</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Save */}
                  <button 
                    onClick={handleSaveNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-elegant-card border border-elegant-border hover:bg-elegant-bg hover:border-elegant-border-light text-elegant-muted hover:text-white text-xs font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Note
                  </button>
                  
                  {/* AI Summarize */}
                  <button 
                    onClick={handleAiSummarize}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-elegant-gold text-neutral-950 hover:bg-elegant-gold/90 text-xs font-bold rounded-lg transition-all shadow-[0_0_12px_rgba(212,175,55,0.15)] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Butler AI Summary
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <input 
                  type="text"
                  placeholder="Note Title"
                  value={noteTitle}
                  onChange={(e) => { setNoteTitle(e.target.value); }}
                  onBlur={handleSaveNote}
                  className="w-full bg-transparent text-xl font-light tracking-wide text-white placeholder-elegant-dark focus:outline-none border-b border-transparent focus:border-elegant-border pb-2 italic font-sans"
                />
              </div>

              {/* Color selector picker */}
              <div className="flex items-center gap-3">
                <Palette className="w-3.5 h-3.5 text-elegant-dark shrink-0" />
                <span className="text-[10px] text-elegant-muted font-mono uppercase tracking-wider">Accent color:</span>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setNoteColor(c.id); }}
                      onBlur={handleSaveNote}
                      style={{ color: c.hex }}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        noteColor === c.id ? "border-white ring-1 ring-offset-2 ring-offset-elegant-bg ring-elegant-gold scale-115" : "border-elegant-border"
                      }`}
                      title={c.label}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-current"></span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Textarea */}
              <div>
                <textarea 
                  rows={14}
                  placeholder="Boss, enter notes, objectives, outlines, or summaries here..."
                  value={noteContent}
                  onChange={(e) => { setNoteContent(e.target.value); }}
                  onBlur={handleSaveNote}
                  className="w-full bg-transparent text-xs text-elegant-text placeholder-elegant-dark focus:outline-none resize-none leading-relaxed font-sans"
                />
              </div>

              {/* Footer info */}
              <div className="pt-4 border-t border-elegant-border/60 flex justify-between text-[10px] text-elegant-dark font-mono uppercase tracking-wider">
                <span>Auto-saved locally</span>
                <span>Last updated: {selectedNote.updatedAt}</span>
              </div>

            </div>
          ) : (
            <div className="bg-elegant-card border border-dashed border-elegant-border rounded-xl p-16 text-center text-elegant-muted flex flex-col justify-center items-center h-[500px]">
              <NotebookPen className="w-10 h-10 text-elegant-dark mb-4 animate-pulse" />
              <h3 className="text-sm font-light text-white mb-1 tracking-wide italic">No Active Memory Block</h3>
              <p className="text-xs text-elegant-muted max-w-sm mb-5 font-sans leading-relaxed">
                Select an existing memory module from the index folder, or trigger a new block to log executive designs.
              </p>
              <button 
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-5 py-2.5 border border-elegant-gold/30 hover:bg-elegant-gold/10 text-elegant-gold hover:text-white rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
              >
                + Create Note Block
              </button>
            </div>
          )}
        </div>

      </div>

      {/* AI Synthesis Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-elegant-card border border-elegant-border rounded-xl p-6 w-full max-w-xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-elegant-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4.5 h-4.5 text-elegant-gold" />
                <h3 className="text-sm font-light tracking-wide text-white italic">Butler AI Memory Synthesis</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAiModal(false)}
                className="text-elegant-muted hover:text-white font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-1">
              {isAnalyzing ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-elegant-gold mx-auto" />
                  <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-wider">Consulting memory engine and preparing executive brief...</p>
                </div>
              ) : (
                <div className="text-xs leading-relaxed text-elegant-text prose prose-invert font-sans py-2">
                  {aiAnalysis}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-elegant-border/60">
              <button 
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2.5 bg-elegant-gold text-neutral-950 font-bold text-xs rounded-lg hover:bg-elegant-gold/90 transition-colors font-mono uppercase tracking-widest cursor-pointer"
              >
                Understood, Boss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
