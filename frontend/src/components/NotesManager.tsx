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

