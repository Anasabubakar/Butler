"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Delegation } from "@/types";
import Card from "./Card";
import Button from "./Button";

type FilterKey = "awaiting" | "in_flight" | "approved" | "rejected" | "all";

function DelegationCard({
  item,
  onApprove,
  onReject,
  busy,
}: {
  item: Delegation;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  busy?: boolean;
}) {
  const service = item.service.toUpperCase();
  const canAct = item.status === "awaiting" && onApprove && onReject;

  return (
    <Card tone="paper" className="p-6 min-h-[200px] flex flex-col">
      <div className="flex items-center gap-1 mb-2">
        <span className="mono-label text-b-accent-text">{service}</span>
        {item.context && (
          <span className="mono-label text-b-text-tertiary">· {item.context}</span>
        )}
      </div>
      <h3 className="body-md-med text-b-text-primary mb-4">{item.title}</h3>
      {item.draft && (
        <div className="rounded-[6px] bg-b-sunken px-3 py-3 flex-1">
          <p className="body-sm text-b-text-secondary line-clamp-4">{item.draft}</p>
        </div>
      )}
      <div className="flex items-center justify-between mt-4 gap-3">
        <span className="inline-block px-2 py-0.5 rounded-[4px] mono-label bg-b-accent-soft text-b-accent-text">
          {item.toneLabel || item.status}
        </span>
        {canAct && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(item.id)}
              className="px-3 py-2 rounded-[6px] border border-b-border-default mono-label text-b-text-primary hover:bg-b-sunken transition-colors cursor-pointer disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprove(item.id)}
              className="px-3 py-2 rounded-[6px] bg-b-ink mono-label text-b-text-inverse hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function TaskDelegation() {
  const [items, setItems] = useState<Delegation[]>([]);
  const [filter, setFilter] = useState<FilterKey>("awaiting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    service: "Gmail",
    context: "",
    draft: "",
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = filter === "all" ? undefined : filter;
      const data = await api.delegations.list(status);
      setItems(data);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Failed to load delegations");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await api.delegations.approve(id);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
