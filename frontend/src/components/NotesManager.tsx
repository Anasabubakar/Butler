"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Button from "./Button";
import { usePrefersReducedMotion } from "@/lib/motion";

type MemoryFilter = "all" | string;

const ROTATIONS = [-1.5, 1, 0.5, -1, 1.5, -0.5];

export default function NotesManager() {
  const reducedMotion = usePrefersReducedMotion();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("memory");
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

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.tag) set.add(n.tag.toLowerCase());
    });
    return Array.from(set).sort();
  }, [notes]);

  const filters: Array<{ key: MemoryFilter; label: string }> = [
    { key: "all", label: `All memory · ${notes.length}` },
    ...tags.map((t) => ({
      key: t,
      label: t.charAt(0).toUpperCase() + t.slice(1),
    })),
  ];

  const visible =
    filter === "all"
      ? notes
      : notes.filter((n) => (n.tag || "").toLowerCase() === filter);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setTag("memory");
    setShowEditor(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setTag(note.tag || "memory");
    setShowEditor(true);
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.notes.update(editing.id, {
          title: title.trim(),
          content,
          tag,
        });
      } else {
        await api.notes.create({
          title: title.trim(),
          content,
          color: "#F5EFE6",
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
    if (!window.confirm("Delete this memory?")) return;
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
            <p className="body-lg mt-4 text-b-text-secondary">
              What Butler has learned, and what you&apos;ve told it to remember.
            </p>
          </div>
          <Button variant="accent" size="sm" onClick={openCreate} className="shrink-0 mt-2">
            + Add memory
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-8 max-w-[1400px]">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-full mono-label transition-colors cursor-pointer ${
                filter === key
                  ? "bg-b-ink text-b-text-inverse"
                  : "border border-b-border-default text-b-text-secondary hover:text-b-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="body-sm text-b-danger mt-6" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="body-sm text-b-text-tertiary mt-12 animate-pulse">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="mt-12 max-w-lg rounded-[14px] border border-b-border-subtle bg-b-paper p-10">
            <p className="type-h4 text-b-text-primary">No memories yet</p>
            <p className="body-sm text-b-text-secondary mt-2">
              Add people preferences, project context, or rituals Butler should never forget.
            </p>
            <Button variant="accent" size="sm" className="mt-5" onClick={openCreate}>
              Add first memory
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-3 gap-8 max-w-[1400px]">
            {visible.map((note, i) => {
              const accent = i % 3 === 1;
              return (
                <motion.div
                  key={note.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)` }}
                  className={`group relative rounded-[10px] p-5 min-h-[180px] shadow-[2px_6px_16px_rgba(26,15,8,0.08)] ${
                    accent ? "bg-b-accent-soft" : "bg-b-paper"
                  }`}
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
              );
            })}
          </div>
        )}

        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-b-ink/40 p-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-editor-title"
              className="w-full max-w-lg rounded-[14px] bg-b-paper border border-b-border-subtle p-6 shadow-xl"
            >
              <h2 id="memory-editor-title" className="type-h3 mb-4">
                {editing ? "Edit memory" : "Add a memory"}
              </h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What should Butler remember?"
                className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
              />
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag (people, projects, boss…)"
                className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Context, people, preferences…"
                rows={4}
                className="w-full bg-b-sunken rounded-[10px] px-4 py-3 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowEditor(false)}>
                  Cancel
                </Button>
                <Button variant="accent" onClick={save} disabled={!title.trim() || saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Save memory"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
