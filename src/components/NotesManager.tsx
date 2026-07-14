import React, { useState, useEffect } from "react";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";
import { Note } from "../types";

const DEMO_NOTES: Note[] = [
  { id: "n1", title: "Kai prefers dry replies before 10am.",               content: "Observation from three consecutive mornings — Kai responds better to terse, no-fluff messages early in the day. After lunch he's warmer.", updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(), color: "cream", tag: "people" },
  { id: "n2", title: "Meridian is sensitive to deployment windows.",        content: "They cancelled the last deploy that hit their quiet hours (9pm–7am UTC). Always schedule deploys between 10am–4pm their local.", updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), color: "terracotta", tag: "ops" },
  { id: "n3", title: "Board reads best with a graph up front.",             content: "Feedback from Q2 board meeting: lead with one visual, then 3 bullets max. They skim first, read later.", updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(), color: "cream", tag: "comm" },
  { id: "n4", title: "Late-week Fridays: no deep-work holds.",              content: "Boss tends to wrap early on Fridays. Don't schedule protected focus blocks after 3pm on Fridays.", updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), color: "sage", tag: "rhythm" },
  { id: "n5", title: "Series-B deck: TAM slide needs actual figures.",      content: "The current TAM number is placeholder. Need to pull from the Notion research doc and cross-ref with Kai's last model.", updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(), color: "cream", tag: "project" },
  { id: "n6", title: "Boss signs off with first name only.",                content: "In formal emails, Boss uses just the first name. No 'Best,' no 'Thanks,' — just the name on a new line.", updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(), color: "terracotta", tag: "voice" },
  { id: "n7", title: "Nadia needs 48h notice for contract reviews.",         content: "Legal team has a 48-hour SLA. If something is urgent, flag Nadia directly on Slack with @urgent.", updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(), color: "sage", tag: "people" },
  { id: "n8", title: "GitHub: always squash-merge to main.",                content: "Team convention: squash commits before merging. Keeps main linear. Kai enforces this on PRs.", updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(), color: "cream", tag: "ops" },
];

const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 0.5, -0.5, 1];

export default function NotesMemory() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("butler_notes");
    if (saved) try { return JSON.parse(saved); } catch { /* fall through */ }
    return DEMO_NOTES;
  });

  const [selected, setSelected] = useState<Note | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    localStorage.setItem("butler_notes", JSON.stringify(notes));
  }, [notes]);

  const tags = ["all", ...Array.from(new Set(notes.map((n) => n.tag).filter(Boolean)))];
  const filtered = filter === "all" ? notes : notes.filter((n) => n.tag === filter);

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const addNote = () => {
    const newNote: Note = {
      id: "n-" + Math.random().toString(36).slice(2, 9),
      title: "New memory",
      content: "",
      updatedAt: new Date().toISOString(),
      color: "cream",
      tag: "note",
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelected(newNote);
  };

  return (
    <div className="w-full h-full flex" style={{ background: "var(--color-b-canvas)" }}>
      {/* STICKY NOTE WALL */}
      <div className="flex-1 overflow-y-auto px-14 pt-14 pb-14">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <h1 className="display-s" style={{ color: "var(--color-b-text-primary)" }}>Memory</h1>
            <p className="body-lg mt-3" style={{ color: "var(--color-b-text-secondary)" }}>
              What Butler knows — observed, inferred, and remembered.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={addNote}>+ Add memory</Button>
        </div>

        {/* Tag filters */}
        <div className="flex gap-3 mt-6 mb-8 flex-wrap">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-full transition-all mono-label"
              style={{
                background: t === filter ? "var(--color-b-accent-soft)" : "var(--color-b-sunken)",
                color: t === filter ? "var(--color-b-accent-text)" : "var(--color-b-text-tertiary)",
                border: `1px solid ${t === filter ? "var(--color-b-accent)" : "var(--color-b-border-subtle)"}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sticky note grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((note, i) => (
            <button
              key={note.id}
              onClick={() => setSelected(note)}
              className="text-left rounded-[14px] p-5 min-h-[160px] flex flex-col justify-between transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: noteColor(note.color),
                transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`,
                border: selected?.id === note.id ? "2px solid var(--color-b-accent)" : "1px solid var(--color-b-border-subtle)",
                boxShadow: "0 4px 12px rgba(28,24,21,0.06)",
              }}
            >
              <div>
                <div className="body-md-med mb-2" style={{ color: "var(--color-b-text-primary)" }}>{note.title}</div>
                <div className="body-sm line-clamp-3" style={{ color: "var(--color-b-text-secondary)" }}>
                  {note.content}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>{formatAgo(note.updatedAt)}</span>
                {note.tag && <Chip tone="neutral">{note.tag}</Chip>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DETAIL PANEL */}
      {selected && (
        <div
          className="w-[400px] flex-shrink-0 border-l overflow-y-auto"
          style={{ background: "var(--color-b-paper)", borderColor: "var(--color-b-border-subtle)" }}
        >
          <div className="p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="mono-label" style={{ color: "var(--color-b-accent-text)" }}>Memory detail</div>
              <button
                onClick={() => setSelected(null)}
                className="mono-label"
                style={{ color: "var(--color-b-text-tertiary)" }}
              >
                Close ×
              </button>
            </div>

            <input
              className="h-3 bg-transparent outline-none w-full"
              style={{ color: "var(--color-b-text-primary)" }}
              value={selected.title}
              onChange={(e) => {
                const updated = { ...selected, title: e.target.value, updatedAt: new Date().toISOString() };
                setSelected(updated);
                setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
              }}
            />

            <textarea
              className="body-md bg-transparent outline-none w-full min-h-[200px] resize-none"
              style={{ color: "var(--color-b-text-secondary)" }}
              value={selected.content}
              onChange={(e) => {
                const updated = { ...selected, content: e.target.value, updatedAt: new Date().toISOString() };
                setSelected(updated);
                setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
              }}
              placeholder="Write the memory content here…"
            />

            {/* Meta section */}
            <div
              className="rounded-[10px] p-4 flex flex-col gap-3"
              style={{ background: "var(--color-b-sunken)" }}
            >
              <div className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Confidence</div>
              <div className="h-1.5 rounded-full" style={{ background: "var(--color-b-border-subtle)" }}>
                <div className="h-full rounded-full" style={{ width: "85%", background: "var(--color-b-accent)" }} />
              </div>
              <div className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
                Inferred from 3 observations over 2 weeks
              </div>
            </div>

            <div
              className="rounded-[10px] p-4 flex flex-col gap-2"
              style={{ background: "var(--color-b-sunken)" }}
            >
              <div className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>Applied to</div>
              <div className="body-sm" style={{ color: "var(--color-b-text-secondary)" }}>
                Slack replies · Calendar scheduling · Email drafts
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Chip tone={selected.tag === "people" ? "accent" : selected.tag === "ops" ? "info" : "neutral"}>
                {selected.tag || "untagged"}
              </Chip>
              <span className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
                Last updated {formatAgo(selected.updatedAt)}
              </span>
            </div>

            <button
              onClick={() => deleteNote(selected.id)}
              className="mono-label mt-2"
              style={{ color: "var(--color-b-danger)" }}
            >
              Delete this memory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function noteColor(color?: string) {
  switch (color) {
    case "terracotta": return "var(--color-b-accent-soft)";
    case "sage":       return "#E8EDE4";
    default:           return "var(--color-b-paper)";
  }
}

function formatAgo(iso: string | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d >= 7) return `${Math.floor(d / 7)}w ago`;
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "just now";
}
