"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Button from "./Button";
import { usePrefersReducedMotion } from "@/lib/motion";

type MemoryFilter = "all" | "people" | "projects" | "boss" | "system";

interface MemoryCard {
  id: string;
  category: string;
  title: string;
  body: string;
  variant: "paper" | "accent";
  rotate: number;
}

const FILTERS: Array<{ key: MemoryFilter; label: string }> = [
  { key: "all", label: "All memory · 148" },
  { key: "people", label: "About people" },
  { key: "projects", label: "About projects" },
  { key: "boss", label: "About Boss" },
  { key: "system", label: "System" },
];

const DEMO_MEMORIES: MemoryCard[] = [
  {
    id: "kai",
    category: "PEOPLE · KAI",
    title: "Kai prefers dry replies before 10am.",
    body: "Especially about the deck. Anything mushy reads wrong to him — save warmth for the last sentence.",
    variant: "paper",
    rotate: 1.5,
  },
  {
    id: "meridian",
    category: "PROJECT · MERIDIAN",
    title: "Meridian is sensitive to deploy windows.",
    body: "Never book anything against a Wed/Thu ship. They will remember for weeks.",
    variant: "accent",
    rotate: -1,
  },
  {
    id: "board",
    category: "REFERENCE · BOARD",
    title: "Board pack reads best with a graph up front.",
    body: "The last three packs that landed well opened with a single chart — one number, one arrow. Boss likes this format.",
    variant: "paper",
    rotate: 0.5,
  },
  {
    id: "friday",
    category: "BOSS · RITUAL",
    title: "No deep-work holds on late-week Fridays.",
    body: "You take Fridays 3PM onward off. Butler auto-declines meeting requests inside that window — quietly.",
    variant: "paper",
    rotate: -1.5,
  },
  {
    id: "signature",
    category: "SYSTEM",
    title: "Draft signature.",
    body: "Boss signs personal notes with — B. Boss signs professional notes with the full first name only.",
    variant: "accent",
    rotate: 1,
  },
  {
    id: "amara",
    category: "PEOPLE · AMARA",
    title: "Coffee, not tea.",
    body: "In every draft to Amara: offer coffee. She's on record about it. Butler will remember.",
    variant: "paper",
    rotate: -0.5,
  },
];

export default function NotesManager() {
  const reducedMotion = usePrefersReducedMotion();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notes.list();
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const save = async () => {
    if (!title.trim()) return;
    try {
      await api.notes.create({ title, content, color: "#F5EFE6", tag: "memory" });
      setTitle("");
      setContent("");
      setShowEditor(false);
      fetchNotes();
    } catch {}
  };

  const memories =
    notes.length > 0
      ? notes.map((n, i) => ({
          id: n.id,
          category: (n.tag ?? "MEMORY").toUpperCase(),
          title: n.title,
          body: n.content,
          variant: (i % 3 === 1 ? "accent" : "paper") as "paper" | "accent",
          rotate: [-1.5, 1, 0.5, -1, 1.5, -0.5][i % 6],
        }))
      : DEMO_MEMORIES;

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
          <Button variant="accent" size="sm" onClick={() => setShowEditor(true)} className="shrink-0 mt-2">
            + Add memory
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-8 max-w-[1400px]">
          {FILTERS.map(({ key, label }) => (
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

        {loading ? (
          <p className="body-sm text-b-text-tertiary mt-12 animate-pulse">Loading…</p>
        ) : (
          <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-3 gap-8 max-w-[1400px]">
            {memories.map((card, i) => (
              <motion.div
                key={card.id}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ transform: `rotate(${card.rotate}deg)` }}
                className={`rounded-[10px] p-5 min-h-[180px] shadow-[2px_6px_16px_rgba(26,15,8,0.08)] ${
                  card.variant === "accent" ? "bg-b-accent-soft" : "bg-b-paper"
                }`}
              >
                <p className="mono-label text-b-accent-text mb-3">{card.category}</p>
                <h3 className="body-md-med text-b-text-primary mb-2">{card.title}</h3>
                <p className="body-sm text-b-text-secondary leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>
        )}

        {showEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-b-ink/40 p-6">
            <div className="w-full max-w-lg rounded-[14px] bg-b-paper border border-b-border-subtle p-6 shadow-xl">
              <h2 className="heading-sm mb-4">Add a memory</h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What should Butler remember?"
                className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
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
                <Button variant="accent" onClick={save} disabled={!title.trim()}>
                  Save memory
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}