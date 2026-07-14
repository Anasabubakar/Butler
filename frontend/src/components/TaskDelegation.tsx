"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Delegation } from "@/types";
import Card from "./Card";
import Chip from "./Chip";
import Button from "./Button";

export default function TaskDelegation() {
  const [items, setItems] = useState<Delegation[]>([]);
  const [filter, setFilter] = useState<string>("awaiting");
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.delegations.list(filter);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (id: string) => {
    try {
      await api.delegations.approve(id);
      fetchItems();
    } catch {}
  };

  const handleReject = async (id: string) => {
    try {
      await api.delegations.reject(id);
      fetchItems();
    } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-b-canvas">
      <header className="px-6 py-4 border-b border-b-border-subtle">
        <h2 className="heading-md">Task Delegation</h2>
        <div className="flex gap-1.5 mt-3">
          {["awaiting", "approved", "rejected"].map((s) => (
            <Chip
              key={s}
              tone={filter === s ? "ink" : "neutral"}
              variant={filter === s ? "solid" : "soft"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(s)}
            >
              {s}
            </Chip>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <p className="body-sm text-b-text-tertiary animate-pulse">Loading...</p>
        ) : items.length === 0 ? (
          <p className="body-sm text-b-text-secondary">No delegations yet, Boss.</p>
        ) : (
          items.map((d) => (
            <Card key={d.id} tone="raised" className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="heading-sm truncate">{d.title}</h3>
                    <Chip tone={d.tone} variant="soft">
                      {d.toneLabel}
                    </Chip>
                  </div>
                  <p className="body-xs text-b-text-secondary mt-1 capitalize">
                    {d.service}
                  </p>
                  <p className="body-sm text-b-text-primary mt-2 line-clamp-2">
                    {d.draft}
                  </p>
                </div>
              </div>
              {d.status === "awaiting" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-b-border-subtle">
                  <Button variant="accent" size="sm" onClick={() => handleApprove(d.id)}>
                    Approve
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleReject(d.id)}>
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
