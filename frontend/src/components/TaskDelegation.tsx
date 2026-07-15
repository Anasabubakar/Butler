"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Delegation } from "@/types";
import Card from "./Card";

type FilterKey = "awaiting" | "drafts" | "inflight" | "complete" | "all";

interface DemoDelegation {
  id: string;
  service: string;
  recipient: string;
  title: string;
  draft: string;
  tone: string;
  status: "awaiting" | "inflight";
}

const FILTERS: Array<{ key: FilterKey; label: string; active?: boolean }> = [
  { key: "awaiting", label: "Awaiting you · 12", active: true },
  { key: "drafts", label: "Drafts · 8" },
  { key: "inflight", label: "In flight · 4" },
  { key: "complete", label: "Complete · 41" },
  { key: "all", label: "All services" },
];

const DEMO_AWAITING: DemoDelegation[] = [
  {
    id: "demo-gmail",
    service: "GMAIL",
    recipient: "to Kai Rivera",
    title: "Reply on Series-B deck v9 review",
    draft:
      "“Read the whole thing this morning, Kai — Alt A on Slide 4 lands cleaner. I'll drop the new one before EOD. Rest looks strong…”",
    tone: "Tone · dry · warm",
    status: "awaiting",
  },
  {
    id: "demo-slack",
    service: "SLACK",
    recipient: "to Meridian ops",
    title: "Reschedule request for 10AM",
    draft:
      "“Hey team — we've had a conflict pop up. Can we push to 10:45? Same room, same coffee, same agenda…”",
    tone: "Tone · polite · direct",
    status: "awaiting",
  },
  {
    id: "demo-notion",
    service: "NOTION",
    recipient: "Q3 rituals",
    title: "Create new page with outline",
    draft:
      "Header · Cadence · Handoffs · Postmortem template. Three sections and an appendix — I've drafted stubs.",
    tone: "Tone · internal · reference",
    status: "awaiting",
  },
];

const DEMO_INFLIGHT: DemoDelegation[] = [
  {
    id: "demo-github",
    service: "GITHUB",
    recipient: "PR #412",
    title: "Comment on auth refactor",
    draft: "Left a review in your voice — flagged the session edge case, approved the rest.",
    tone: "Tone · technical · concise",
    status: "inflight",
  },
  {
    id: "demo-linear",
    service: "LINEAR",
    recipient: "MER-88",
    title: "Update deploy ticket",
    draft: "Moved window to Wed 14:00 and notified ops in Slack.",
    tone: "Tone · factual",
    status: "inflight",
  },
];

function isDemoItem(item: DemoDelegation | Delegation): item is DemoDelegation {
  return "recipient" in item;
}

function DelegationCard({
  item,
  onApprove,
  onReject,
}: {
  item: DemoDelegation | Delegation;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const service = item.service.toUpperCase();
  const recipient = isDemoItem(item) ? item.recipient : `· ${item.context}`;
  const title = item.title;
  const draft = item.draft;
  const tone = isDemoItem(item) ? item.tone : `Tone · ${item.toneLabel}`;

  return (
    <Card tone="paper" className="p-6 min-h-[220px] flex flex-col">
      <div className="flex items-center gap-1 mb-2">
        <span className="mono-label text-b-accent-text">{service}</span>
        {recipient && (
          <span className="mono-label text-b-text-tertiary">{recipient}</span>
        )}
      </div>
      <h3 className="body-md-med text-b-text-primary mb-4">{title}</h3>
      <div className="rounded-[6px] bg-b-sunken px-3 py-3 flex-1">
        <p className="body-sm text-b-text-secondary line-clamp-3">{draft}</p>
      </div>
      <div className="flex items-center justify-between mt-4 gap-3">
        <span className="inline-block px-2 py-0.5 rounded-[4px] mono-label bg-b-accent-soft text-b-accent-text">
          {tone}
        </span>
        {onApprove && onReject && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onReject(item.id)}
              className="px-3 py-2 rounded-[6px] border border-b-border-default mono-label text-b-text-primary hover:bg-b-sunken transition-colors cursor-pointer"
            >
              Reject
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-[6px] border border-b-border-default mono-label text-b-text-primary hover:bg-b-sunken transition-colors cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onApprove(item.id)}
              className="px-3 py-2 rounded-[6px] bg-b-ink mono-label text-b-text-inverse hover:opacity-90 transition-opacity cursor-pointer"
            >
              Approve &amp; send
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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === "awaiting" ? "awaiting" : filter === "all" ? undefined : filter;
      const data = await api.delegations.list(status ?? "awaiting");
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
    if (id.startsWith("demo-")) return;
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
