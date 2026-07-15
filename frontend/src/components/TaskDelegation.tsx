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
