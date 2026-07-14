"use client";

import { type ReactNode, type HTMLAttributes } from "react";

type ChipTone = "accent" | "success" | "warning" | "danger" | "info" | "neutral" | "ink";
type ChipVariant = "soft" | "solid" | "outline";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  variant?: ChipVariant;
  children: ReactNode;
}

function getChipStyles(tone: ChipTone, variant: ChipVariant): string {
  const map: Record<ChipTone, { soft: string; solid: string; outline: string }> = {
    accent: {
      soft: "bg-b-accent-soft text-b-accent-text",
      solid: "bg-b-accent text-b-text-on-accent",
      outline: "border-b-accent text-b-accent-text bg-transparent",
    },
    success: {
      soft: "bg-b-success-soft text-b-success",
      solid: "bg-b-success text-white",
      outline: "border-b-success text-b-success bg-transparent",
    },
    warning: {
      soft: "bg-b-warning-soft text-b-warning",
      solid: "bg-b-warning text-white",
      outline: "border-b-warning text-b-warning bg-transparent",
    },
    danger: {
      soft: "bg-b-danger-soft text-b-danger",
      solid: "bg-b-danger text-white",
      outline: "border-b-danger text-b-danger bg-transparent",
    },
    info: {
      soft: "bg-b-info-soft text-b-info",
      solid: "bg-b-info text-white",
      outline: "border-b-info text-b-info bg-transparent",
    },
    neutral: {
      soft: "bg-b-sunken text-b-text-secondary",
      solid: "bg-b-border-strong text-b-text-inverse",
      outline: "border-b-border-default text-b-text-secondary bg-transparent",
    },
    ink: {
      soft: "bg-b-ink/10 text-b-text-primary",
      solid: "bg-b-ink text-b-text-inverse",
      outline: "border-b-ink text-b-text-primary bg-transparent",
    },
  };

  return map[tone][variant];
}

export default function Chip({
  tone = "neutral",
  variant = "soft",
  children,
  className = "",
  ...props
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-4 tracking-wide uppercase border border-transparent
        ${getChipStyles(tone, variant)} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
