"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Card from "./Card";

function isMemoryNote(n: Note) {
  const tag = (n.tag || "").toLowerCase();
  return (
    tag === "memory" ||
    tag === "memories" ||
    tag === "remember" ||
    tag.startsWith("mem")
  );
}

export default function QuickNote() {
  const [content, setContent] = useState("");
  const [recent, setRecent] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);

  const fetchRecent = useCallback(async () => {
    try {
      const allNotes = await api.notes.list();
      // Filter out memory notes, keeping only general notes/stickies
      const stickies = allNotes.filter((n) => !isMemoryNote(n));
      setRecent(stickies.slice(0, 3));
    } catch (err) {
      console.error("Failed to load quick notes:", err);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleSave = async () => {
    const text = content.trim();
    if (!text || busy) return;

    setBusy(true);
    try {
      // Pick a random sticky pad color
      const colors = ["#FFF59D", "#FFE082", "#FFCCBC", "#F8BBD0", "#C8E6C9", "#B3E5FC"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Auto-extract title from first line or keep it brief
      const lines = text.split("\n").filter(Boolean);
      const title = lines[0] ? (lines[0].length > 30 ? lines[0].slice(0, 27) + "..." : lines[0]) : "Quick note";

      await api.notes.create({
        title,
        content: text,
        tag: "note",
        color: randomColor,
      });

      setContent("");
      await fetchRecent();
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.notes.delete(id);
      await fetchRecent();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <Card tone="paper" radius="lg" className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-b-border-subtle pb-3">
        <div>
          <span className="mono-label text-b-accent-text">Quick Note</span>
          <h4 className="type-h4 mt-0.5 text-b-text-primary">Instant capture.</h4>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !content.trim()}
          className="w-8 h-8 rounded-full bg-b-ink hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center text-b-text-inverse font-semibold cursor-pointer disabled:cursor-not-allowed"
          title="Save note"
        >
          +
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleSave();
          }
        }}
        placeholder="Type a thought... (Ctrl+Enter to save)"
        rows={3}
        className="w-full bg-transparent body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none resize-none"
      />

      {recent.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-b-border-subtle/60">
          <p className="mono-label text-b-text-tertiary">Recent stickies</p>
          <div className="flex flex-col gap-2">
            {recent.map((note) => (
              <div
                key={note.id}
                className="group flex items-start justify-between gap-3 p-2.5 rounded-[8px] bg-b-sunken/45 hover:bg-b-sunken/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="body-sm-med text-b-text-primary truncate">{note.title}</p>
                  <p className="body-xs text-b-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                    {note.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="mono-label text-b-text-tertiary hover:text-b-danger cursor-pointer px-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete note"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
