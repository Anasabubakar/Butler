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
    if (id.startsWith("demo-")) return;
    try {
      await api.delegations.reject(id);
      fetchItems();
    } catch {}
  };

  const showDemo = !loading && items.length === 0;
  const awaitingItems = showDemo ? DEMO_AWAITING : items.filter((d) => d.status === "awaiting");
  const inflightItems = showDemo
    ? DEMO_INFLIGHT
    : items.filter((d) => d.status === "in_flight");

  return (
    <div className="h-full overflow-y-auto bg-b-canvas">
      <div className="px-14 pt-14 pb-14 max-w-[1400px]">
        <h1 className="display-s text-b-text-primary">Delegated Work</h1>
        <p className="body-lg mt-4 text-b-text-secondary">
          Butler is drafting these on your behalf. You approve; it acts.
        </p>

        <div className="flex flex-wrap gap-2 mt-8">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-full mono-label transition-colors cursor-pointer ${
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
          <p className="body-sm text-b-text-tertiary mt-10 animate-pulse">Loading…</p>
        ) : (
          <div className="mt-10 grid lg:grid-cols-2 gap-10">
            <div>
              <p className="mono-label text-b-accent-text mb-4">
                AWAITING YOUR NOD · {awaitingItems.length}
              </p>
              <div className="flex flex-col gap-4">
                {awaitingItems.length === 0 ? (
                  <p className="body-sm text-b-text-secondary">Nothing awaiting approval.</p>
                ) : (
                  awaitingItems.map((d) => (
                    <DelegationCard
                      key={d.id}
                      item={d}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mono-label text-b-text-tertiary mb-4">
                IN FLIGHT · {inflightItems.length || (showDemo ? 0 : "—")}
              </p>
              <div className="flex flex-col gap-4">
                {(showDemo ? inflightItems : []).map((d) => (
                  <DelegationCard key={d.id} item={d} />
                ))}
                {!showDemo && inflightItems.length === 0 && (
                  <p className="body-sm text-b-text-secondary">No tasks in flight.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}