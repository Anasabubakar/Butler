"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Button from "./Button";
import { usePrefersReducedMotion } from "@/lib/motion";

type Pane = "notes" | "memory";

const STICKY_COLORS = [
  "#FFF6A5", // classic yellow
  "#FFD6E0", // blush
  "#C8F0D4", // mint
  "#D4E8FF", // sky
  "#F5E6FF", // lavender
  "#FFE4C4", // peach
];

const ROTATIONS = [-2.2, 1.4, -0.8, 1.8, -1.5, 0.6, -1.1, 2];

function isMemoryNote(n: Note) {
  const tag = (n.tag || "").toLowerCase();
  return tag === "memory" || tag === "memories" || tag === "remember" || tag.startsWith("mem");
}

function stickyColor(n: Note, index: number) {
  if (n.color && n.color.startsWith("#") && n.color !== "#F5EFE6") return n.color;
  return STICKY_COLORS[index % STICKY_COLORS.length];
}

export default function NotesManager() {
  const reducedMotion = usePrefersReducedMotion();
  const [notes, setNotes] = useState<Note[]>([]);
  const [pane, setPane] = useState<Pane>("notes");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("note");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.notes.list();
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotes([]);
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const notesList = useMemo(() => notes.filter((n) => !isMemoryNote(n)), [notes]);
  const memoryList = useMemo(() => notes.filter((n) => isMemoryNote(n)), [notes]);
  const visible = pane === "notes" ? notesList : memoryList;

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setTag(pane === "memory" ? "memory" : "note");
    setShowEditor(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setTag(note.tag || (isMemoryNote(note) ? "memory" : "note"));
    setShowEditor(true);
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    const color =
      editing?.color && editing.color !== "#F5EFE6"
        ? editing.color
        : STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    try {
      if (editing) {
        await api.notes.update(editing.id, {
          title: title.trim(),
          content,
          tag,
          color,
        });
      } else {
        await api.notes.create({
          title: title.trim(),
          content,
          color,
          tag,
        });
      }
      setShowEditor(false);
      setEditing(null);
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(pane === "memory" ? "Delete this memory?" : "Delete this note?")) return;
    try {
      await api.notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14">
        <div className="flex items-start justify-between gap-4 max-w-[1400px]">
          <div>
            <h1 className="display-s text-b-text-primary">Notes &amp; Memory</h1>
            <p className="body-lg mt-4 text-b-text-secondary max-w-xl">
              Sticky notes for quick thoughts — and a separate memory bank for what Butler should never forget.
            </p>
          </div>
          <Button variant="accent" size="sm" onClick={openCreate} className="shrink-0 mt-2">
            {pane === "memory" ? "+ Add memory" : "+ New sticky"}
          </Button>
        </div>

        {/* Notes / Memory toggle */}
        <div
          className="mt-8 inline-flex p-1.5 rounded-full bg-b-sunken border border-b-border-subtle"
          role="tablist"
          aria-label="Notes or Memory"
        >
          {(
            [
              ["notes", `Notes · ${notesList.length}`],
              ["memory", `Memory · ${memoryList.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={pane === key}
              onClick={() => setPane(key)}
              className={`px-5 py-2 rounded-full mono-label transition-colors cursor-pointer ${
                pane === key
                  ? "bg-b-ink text-b-text-inverse shadow-sm"
                  : "text-b-text-secondary hover:text-b-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="body-sm text-b-text-tertiary mt-4 max-w-lg">
          {pane === "notes"
            ? "Personal stickies — color, tilt, and pin what you're thinking."
            : "Long-term facts, preferences, and people context Butler uses in every conversation."}
        </p>

        {error && (
          <p className="body-sm text-b-danger mt-6" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="body-sm text-b-text-tertiary mt-12 animate-pulse">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="mt-12 max-w-lg rounded-[14px] border border-dashed border-b-border-default bg-b-paper p-10">
            <p className="type-h4 text-b-text-primary">
              {pane === "notes" ? "No stickies yet" : "No memories yet"}
            </p>
            <p className="body-sm text-b-text-secondary mt-2">
              {pane === "notes"
                ? "Drop a quick note — grocery list, idea, or reminder."
                : "Add people preferences, project context, or rituals Butler should never forget."}
            </p>
            <Button variant="accent" size="sm" className="mt-5" onClick={openCreate}>
              {pane === "notes" ? "Write first sticky" : "Add first memory"}
            </Button>
          </div>
        ) : pane === "notes" ? (
          /* Sticky notes wall */
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1400px] items-start">
            {visible.map((note, i) => {
              const bg = stickyColor(note, i);
              const rot = ROTATIONS[i % ROTATIONS.length];
              return (
                <motion.article
                  key={note.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.28) }}
                  style={{
                    backgroundColor: bg,
                    transform: `rotate(${rot}deg)`,
                  }}
                  className="group relative min-h-[200px] p-5 shadow-[3px_8px_20px_rgba(26,15,8,0.12)] rounded-[2px] border border-black/5"
                >
                  {/* tape strip */}
                  <span
                    aria-hidden
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-white/55 shadow-sm border border-black/5"
                    style={{ transform: "translateX(-50%) rotate(-1deg)" }}
                  />
                  <p className="mono-label text-black/45 mb-3 tracking-wide">
                    {(note.tag || "NOTE").toUpperCase()}
                  </p>
                  <h3
                    className="text-[18px] leading-snug text-[#1a0f08] mb-2 pr-2"
                    style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
                  >
                    {note.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#1a0f08]/85 whitespace-pre-wrap line-clamp-8">
                    {note.content}
                  </p>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEdit(note)}
                      className="px-2 py-1 rounded-[6px] bg-white/80 mono-label text-[#1a0f08]/70 hover:text-[#1a0f08] cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(note.id)}
                      className="px-2 py-1 rounded-[6px] bg-white/80 mono-label text-b-danger cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          /* Memory cards — calmer, not sticky */
          <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1400px]">
            {visible.map((note, i) => (
              <motion.div
                key={note.id}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="group relative rounded-[12px] p-5 min-h-[160px] bg-b-paper border border-b-border-subtle shadow-[0_2px_10px_rgba(26,15,8,0.04)]"
              >
                <p className="mono-label text-b-accent-text mb-3">
                  {(note.tag || "MEMORY").toUpperCase()}
                </p>
                <h3 className="body-md-med text-b-text-primary mb-2">{note.title}</h3>
                <p className="body-sm text-b-text-secondary leading-relaxed line-clamp-5">
                  {note.content}
                </p>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(note)}
                    className="px-2 py-1 rounded-[6px] bg-b-raised/90 mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    className="px-2 py-1 rounded-[6px] bg-b-raised/90 mono-label text-b-danger cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-b-ink/40 p-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="note-editor-title"
              className="w-full max-w-lg rounded-[14px] bg-b-paper border border-b-border-subtle p-6 shadow-xl"
            >
              <h2 id="note-editor-title" className="type-h3 mb-4">
                {editing
                  ? pane === "memory"
                    ? "Edit memory"
                    : "Edit sticky"
                  : pane === "memory"
                  ? "Add a memory"
                  : "New sticky note"}
              </h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={pane === "memory" ? "What should Butler remember?" : "Title"}
                className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
              />
              {pane === "memory" && (
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Tag (people, projects, boss…)"
                  className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
                />
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  pane === "memory"
                    ? "Context, people, preferences…"
                    : "Write on the sticky…"
                }
                rows={5}
                className="w-full bg-b-sunken rounded-[10px] px-4 py-3 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button variant="accent" onClick={save} disabled={!title.trim() || saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
