"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Button from "./Button";
import { usePrefersReducedMotion } from "@/lib/motion";

/** Classic sticky pad colors — paper yellows, pinks, mint, sky */
const STICKY_PALETTE = [
  "#FFF59D",
  "#FFE082",
  "#FFCCBC",
  "#F8BBD0",
  "#C8E6C9",
  "#B3E5FC",
  "#E1BEE7",
  "#FFECB3",
  "#DCEDC8",
  "#B2EBF2",
];

/** Stronger tilts so they read as real stickies on a board */
const TILTS = [-7.5, 5.2, -3.8, 6.4, -5.5, 3.2, -6.1, 4.8, -2.4, 7.1, -4.6, 2.8];

/** Vertical nudge so the board feels scattered, not a grid */
const Y_NUDGE = [0, 18, 8, 28, 4, 22, 12, 30, 6, 16, 24, 10];

function isMemoryNote(n: Note) {
  const tag = (n.tag || "").toLowerCase();
  return (
    tag === "memory" ||
    tag === "memories" ||
    tag === "remember" ||
    tag.startsWith("mem")
  );
}

function stickyColor(n: Note, index: number) {
  if (n.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(n.color) && n.color.toUpperCase() !== "#F5EFE6") {
    return n.color;
  }
  return STICKY_PALETTE[index % STICKY_PALETTE.length];
}

/** Resize + compress an image file to a JPEG data URL for polaroids */
async function fileToDataUrl(file: File, maxEdge = 960, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

function formatAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  if (d >= 7) return `${Math.floor(d / 7)}w`;
  if (d >= 1) return `${d}d`;
  if (h >= 1) return `${h}h`;
  return "now";
}

export default function NotesManager() {
  const reducedMotion = usePrefersReducedMotion();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [editorMode, setEditorMode] = useState<"note" | "memory" | "photo">("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("note");
  const [color, setColor] = useState(STICKY_PALETTE[0]);
  const [image, setImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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

  const boardNotes = useMemo(() => notes.filter((n) => !isMemoryNote(n)), [notes]);
  const memoryList = useMemo(() => notes.filter((n) => isMemoryNote(n)), [notes]);

  const openCreate = (mode: "note" | "memory" | "photo" = "note") => {
    setEditing(null);
    setEditorMode(mode);
    setTitle("");
    setContent("");
    setTag(mode === "memory" ? "memory" : mode === "photo" ? "photo" : "note");
    setColor(STICKY_PALETTE[Math.floor(Math.random() * STICKY_PALETTE.length)]);
    setImage("");
    setShowEditor(true);
  };

  const openEdit = (note: Note) => {
    const mem = isMemoryNote(note);
    setEditing(note);
    setEditorMode(note.image ? "photo" : mem ? "memory" : "note");
    setTitle(note.title);
    setContent(note.content);
    setTag(note.tag || (mem ? "memory" : "note"));
    setColor(stickyColor(note, 0));
    setImage(note.image || "");
    setShowEditor(true);
  };

  const onPickFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, "") || "Photo");
      setEditorMode("photo");
      setTag((t) => (t === "memory" ? t : "photo"));
      if (!showEditor) {
        setEditing(null);
        setContent("");
        setColor(STICKY_PALETTE[0]);
        setShowEditor(true);
      }
    } catch {
      setError("Could not read that image.");
    }
  };

  const save = async () => {
    if (saving) return;
    if (!title.trim() && !image) return;
    setSaving(true);
    setError(null);
    const finalTitle = title.trim() || (image ? "Photo" : "Untitled");
    const finalTag =
      editorMode === "memory" ? tag.trim() || "memory" : tag.trim() || (image ? "photo" : "note");
    try {
      if (editing) {
        await api.notes.update(editing.id, {
          title: finalTitle,
          content,
          tag: finalTag,
          color,
          image: image || "",
        });
      } else {
        await api.notes.create({
          title: finalTitle,
          content,
          tag: finalTag,
          color,
          image: image || undefined,
        });
      }
      setShowEditor(false);
      setEditing(null);
      setImage("");
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Pull this off the board?")) return;
    try {
      await api.notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-b-canvas">
      {/* Header */}
      <div className="shrink-0 px-8 xl:px-12 pt-10 pb-5 flex flex-wrap items-end justify-between gap-4 border-b border-b-border-subtle/60">
        <div>
          <p className="mono-label text-b-accent-text mb-2">BOARD · NOTES &amp; MEMORY</p>
          <h1 className="display-s text-b-text-primary">The board.</h1>
          <p className="body-md mt-2 text-b-text-secondary max-w-xl">
            Sticky notes, polaroids, and the long-term memory Butler keeps on the side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openCreate("memory")}>
            + Memory
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cameraRef.current?.click()}
          >
            📷 Camera
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            🖼 Photo
          </Button>
          <Button variant="accent" size="sm" onClick={() => openCreate("note")}>
            + Sticky
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error && (
        <p className="shrink-0 px-8 xl:px-12 pt-3 body-sm text-b-danger" role="alert">
          {error}
        </p>
      )}

      {/* Split: moodboard left · memory right */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
        {/* ── Corkboard / moodboard ── */}
        <section className="flex-1 min-w-0 min-h-0 overflow-y-auto relative">
          <div
            className="sticky-board min-h-full px-6 sm:px-10 py-10"
            style={{
              backgroundColor: "#C4A574",
              backgroundImage: `
                radial-gradient(ellipse at 20% 30%, rgba(90,60,30,0.18) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 70%, rgba(60,40,20,0.22) 0%, transparent 45%),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(80,50,25,0.04) 2px,
                  rgba(80,50,25,0.04) 3px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 2px,
                  rgba(80,50,25,0.03) 2px,
                  rgba(80,50,25,0.03) 3px
                )
              `,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <p className="mono-label tracking-[0.14em] text-[#3D2A14]/80">
                STICKY BOARD · {boardNotes.length} pin{boardNotes.length === 1 ? "" : "s"}
              </p>
              <p className="body-sm text-[#3D2A14]/70 hidden sm:block">
                Tilted like the real desk. Drop photos too.
              </p>
            </div>

            {loading ? (
              <p className="body-sm text-[#3D2A14]/80 animate-pulse">Laying out the board…</p>
            ) : boardNotes.length === 0 ? (
              <div className="max-w-md mx-auto mt-16 text-center">
                <div
                  className="inline-block px-8 py-10 shadow-lg"
                  style={{
                    background: "#FFF59D",
                    transform: "rotate(-3deg)",
                    boxShadow: "4px 10px 24px rgba(40,25,10,0.28)",
                  }}
                >
                  <p
                    className="text-[22px] text-[#1a0f08] mb-2"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Empty board
                  </p>
                  <p className="body-sm text-[#1a0f08]/75 mb-5">
                    Pin a sticky, snap a photo, or paste an idea.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCreate("note")}
                      className="px-3 py-1.5 rounded-full bg-[#1a0f08] text-[#FFF59D] mono-label cursor-pointer"
                    >
                      + Sticky
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-3 py-1.5 rounded-full border border-[#1a0f08]/30 mono-label text-[#1a0f08] cursor-pointer"
                    >
                      + Photo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-8 gap-y-10 content-start items-start justify-center sm:justify-start pb-16">
                {boardNotes.map((note, i) => {
                  const tilt = reducedMotion ? 0 : TILTS[i % TILTS.length];
                  const nudge = reducedMotion ? 0 : Y_NUDGE[i % Y_NUDGE.length];
                  const bg = stickyColor(note, i);
                  const isPhoto = Boolean(note.image);

                  if (isPhoto) {
                    return (
                      <motion.article
                        key={note.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 16, rotate: tilt - 4 }}
                        animate={{ opacity: 1, y: nudge, rotate: tilt }}
                        transition={{ delay: Math.min(i * 0.035, 0.35), type: "spring", stiffness: 260, damping: 22 }}
                        className="group relative w-[200px] sm:w-[220px] bg-[#FBF7EF] p-3 pb-5 cursor-pointer"
                        style={{
                          boxShadow:
                            "3px 8px 0 rgba(40,25,10,0.12), 6px 16px 28px rgba(40,25,10,0.28)",
                          transformOrigin: "center top",
                        }}
                        onClick={() => openEdit(note)}
                      >
                        {/* pushpin */}
                        <span
                          aria-hidden
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-10"
                          style={{
                            background:
                              "radial-gradient(circle at 35% 30%, #f5d0c0, #8B3A2A 55%, #5a2018)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
                          }}
                        />
                        <div className="aspect-[4/3] overflow-hidden bg-b-sunken mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={note.image}
                            alt={note.title}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        <p
                          className="text-[15px] text-[#1a0f08] text-center leading-snug px-1"
                          style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
                        >
                          {note.title}
                        </p>
                        {note.content && (
                          <p className="body-xs text-[#1a0f08]/60 text-center mt-1 line-clamp-2 px-1">
                            {note.content}
                          </p>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(note.id);
                            }}
                            className="px-2 py-0.5 rounded bg-white/90 mono-label text-b-danger cursor-pointer shadow"
                          >
                            ×
                          </button>
                        </div>
                      </motion.article>
                    );
                  }

                  return (
                    <motion.article
                      key={note.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 18, rotate: tilt - 5 }}
                      animate={{ opacity: 1, y: nudge, rotate: tilt }}
                      transition={{ delay: Math.min(i * 0.035, 0.35), type: "spring", stiffness: 260, damping: 22 }}
                      className="group relative w-[180px] sm:w-[200px] min-h-[200px] p-5 cursor-pointer"
                      style={{
                        backgroundColor: bg,
                        backgroundImage:
                          "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 28%)",
                        boxShadow:
                          "2px 3px 0 rgba(40,25,10,0.06), 4px 12px 22px rgba(40,25,10,0.22)",
                        transformOrigin: "50% 8%",
                      }}
                      onClick={() => openEdit(note)}
                    >
                      {/* tape */}
                      <span
                        aria-hidden
                        className="absolute -top-3 left-1/2 w-[52px] h-[18px]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,250,230,0.35))",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          transform: "translateX(-50%) rotate(-2deg)",
                          border: "1px solid rgba(0,0,0,0.04)",
                        }}
                      />
                      {/* pin */}
                      <span
                        aria-hidden
                        className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, #fff6, #B85431 50%, #6b2a14)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                        }}
                      />
                      <p className="mono-label text-[#1a0f08]/45 mb-3 mt-2 tracking-wide">
                        {(note.tag || "NOTE").toUpperCase()}
                      </p>
                      <h3
                        className="text-[17px] leading-snug text-[#1a0f08] mb-2 pr-1"
                        style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
                      >
                        {note.title}
                      </h3>
                      <p className="text-[13px] leading-relaxed text-[#1a0f08]/80 whitespace-pre-wrap line-clamp-8">
                        {note.content}
                      </p>
                      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(note);
                          }}
                          className="px-2 py-0.5 rounded bg-black/10 mono-label text-[#1a0f08] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(note.id);
                          }}
                          className="px-2 py-0.5 rounded bg-black/10 mono-label text-b-danger cursor-pointer"
                        >
                          Del
                        </button>
                      </div>
                    </motion.article>
                  );
                })}

                {/* Add tile as a tilted blank sticky */}
                <motion.button
                  type="button"
                  initial={false}
                  animate={{ rotate: reducedMotion ? 0 : 2.5 }}
                  onClick={() => openCreate("note")}
                  className="w-[180px] sm:w-[200px] min-h-[160px] border-2 border-dashed border-[#3D2A14]/35 text-[#3D2A14]/70 hover:border-[#3D2A14]/55 hover:bg-[#3D2A14]/08 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                  style={{ marginTop: reducedMotion ? 0 : 14 }}
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="mono-label">New sticky</span>
                </motion.button>
              </div>
            )}
          </div>
        </section>

        {/* ── Memory rail (right) ── */}
        <aside className="xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l border-b-border-subtle bg-b-paper flex flex-col min-h-[280px] xl:min-h-0 max-h-[45vh] xl:max-h-none">
          <div className="px-6 pt-7 pb-4 border-b border-b-border-subtle flex items-start justify-between gap-3">
            <div>
              <p className="mono-label text-b-accent-text mb-1">MEMORY</p>
              <h2 className="type-h3 text-b-text-primary">What Butler keeps.</h2>
              <p className="body-sm text-b-text-tertiary mt-1">
                Long-term facts — not stickies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreate("memory")}
              className="mono-label text-b-accent-text hover:underline cursor-pointer shrink-0 mt-1"
            >
              + Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
            {loading && (
              <p className="body-sm text-b-text-tertiary animate-pulse">Loading…</p>
            )}
            {!loading && memoryList.length === 0 && (
              <div className="rounded-[12px] border border-dashed border-b-border-default p-5">
                <p className="body-sm-med text-b-text-primary mb-1">No memories yet</p>
                <p className="body-sm text-b-text-tertiary mb-3">
                  Preferences, people, rituals Butler should never forget.
                </p>
                <Button size="sm" variant="primary" onClick={() => openCreate("memory")}>
                  Add memory
                </Button>
              </div>
            )}
            {memoryList.map((m, i) => (
              <motion.div
                key={m.id}
                initial={reducedMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                className="group rounded-[12px] border border-b-border-subtle bg-b-raised p-4 hover:border-b-border-default transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="mono-label text-b-accent-text">
                    {(m.tag || "MEMORY").toUpperCase()}
                  </p>
                  <span className="mono-sm text-b-text-tertiary">{formatAgo(m.updatedAt)}</span>
                </div>
                <h3 className="body-md-med text-b-text-primary mb-1">{m.title}</h3>
                {m.content && (
                  <p className="body-sm text-b-text-secondary line-clamp-4 leading-relaxed">
                    {m.content}
                  </p>
                )}
                <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="mono-label text-b-danger cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </aside>
      </div>

      {/* Editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-b-ink/45 p-4 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-editor-title"
            className="w-full max-w-lg rounded-[16px] bg-b-paper border border-b-border-subtle p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="board-editor-title" className="type-h3 mb-1">
              {editing
                ? editorMode === "memory"
                  ? "Edit memory"
                  : editorMode === "photo"
                  ? "Edit polaroid"
                  : "Edit sticky"
                : editorMode === "memory"
                ? "New memory"
                : editorMode === "photo"
                ? "Pin a photo"
                : "New sticky"}
            </h2>
            <p className="body-sm text-b-text-tertiary mb-4">
              {editorMode === "memory"
                ? "Stored on the right for Butler to use forever."
                : "Lands on the corkboard with a little tilt."}
            </p>

            {image && (
              <div className="mb-4 rounded-[10px] overflow-hidden bg-b-sunken border border-b-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Preview" className="w-full max-h-48 object-cover" />
                <div className="flex gap-2 p-2">
                  <button
                    type="button"
                    className="mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="mono-label text-b-danger cursor-pointer"
                    onClick={() => setImage("")}
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            )}

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                editorMode === "memory"
                  ? "What should Butler remember?"
                  : editorMode === "photo"
                  ? "Caption"
                  : "Title on the sticky"
              }
              className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
              autoFocus
            />

            {editorMode === "memory" && (
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag (people, projects, boss…)"
                className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
              />
            )}

            {editorMode !== "memory" && !image && (
              <div className="mb-3">
                <p className="mono-label text-b-text-tertiary mb-2">Sticky color</p>
                <div className="flex flex-wrap gap-2">
                  {STICKY_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-[6px] border-2 cursor-pointer transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? "#1C1815" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                editorMode === "memory"
                  ? "Context, people, preferences…"
                  : "Write on the note…"
              }
              rows={4}
              className="w-full bg-b-sunken rounded-[10px] px-4 py-3 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent resize-none mb-3"
            />

            {editorMode !== "memory" && !image && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 rounded-full border border-b-border-default mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer"
                >
                  Attach photo
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="px-3 py-1.5 rounded-full border border-b-border-default mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer"
                >
                  Take photo
                </button>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditor(false);
                  setImage("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={save}
                disabled={(!title.trim() && !image) || saving}
              >
                {saving ? "Saving…" : editing ? "Update" : "Pin it"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
