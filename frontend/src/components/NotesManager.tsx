"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Note } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

const COLORS = ["#F5EFE6", "#B85431", "#2D6A4F", "#1D3557", "#6D597A", "#BC6C25"];

export default function NotesManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notes.list();
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setColor(COLORS[0]);
    setTag("");
  };

  const startEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || COLORS[0]);
    setTag(note.tag || "");
  };

  const save = async () => {
    if (!title.trim()) return;
    try {
      if (editing) {
        await api.notes.update(editing.id, { title, content, color, tag: tag || undefined });
      } else {
        await api.notes.create({ title, content, color, tag: tag || undefined });
      }
      resetForm();
      fetchNotes();
    } catch {}
  };

  const remove = async (id: string) => {
    try {
      await api.notes.delete(id);
      fetchNotes();
    } catch {}
  };

  return (
    <div className="h-full flex bg-b-canvas">
      {/* Note list */}
      <div className="w-80 border-r border-b-border-subtle flex flex-col">
        <header className="px-4 py-4 border-b border-b-border-subtle flex items-center justify-between">
          <h2 className="heading-md">Notes</h2>
          <Button variant="accent" size="sm" onClick={resetForm}>
            + New
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading ? (
            <p className="body-sm text-b-text-tertiary animate-pulse">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="body-sm text-b-text-secondary text-center mt-8">
              No notes yet, Boss.
            </p>
          ) : (
            notes.map((n) => (
              <Card
                key={n.id}
                tone="paper"
                radius="md"
                className="p-3 cursor-pointer hover:bg-b-sunken transition-colors"
                onClick={() => startEdit(n)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: n.color || COLORS[0] }}
                  />
                  <h3 className="heading-xs truncate flex-1">{n.title}</h3>
                </div>
                {n.tag && (
                  <Chip tone="neutral" variant="soft" className="mt-1.5">
                    {n.tag}
                  </Chip>
                )}
                <p className="body-xs text-b-text-tertiary mt-1 line-clamp-2">{n.content}</p>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="heading-sm flex-1">
            {editing ? "Edit Note" : "New Note"}
          </h3>
          {editing && (
            <Button variant="ghost" size="sm" onClick={() => remove(editing.id)}>
              Delete
            </Button>
          )}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full bg-b-sunken rounded-[10px] px-4 py-2.5 body-md text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent mb-3"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write something..."
          className="flex-1 w-full bg-b-sunken rounded-[10px] px-4 py-3 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none border border-transparent focus:border-b-accent resize-none mb-3"
        />
        <div className="flex items-center gap-3 mb-4">
          <span className="body-xs text-b-text-secondary">Color:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                color === c ? "border-b-accent scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Tag"
            className="ml-auto bg-b-sunken rounded-[6px] px-3 py-1 body-xs text-b-text-primary placeholder:text-b-text-tertiary outline-none w-32 border border-transparent focus:border-b-accent"
          />
        </div>
        <Button variant="accent" onClick={save} disabled={!title.trim()}>
          {editing ? "Update" : "Create"} Note
        </Button>
      </div>
    </div>
  );
}
