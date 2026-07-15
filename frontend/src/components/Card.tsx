"use client";

import { type ReactNode, type HTMLAttributes } from "react";

type CardTone = "paper" | "raised" | "ink" | "sunken";
type CardRadius = "sm" | "md" | "lg" | "xl" | "2xl";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  radius?: CardRadius;
  bordered?: boolean;
  children: ReactNode;
}

const toneStyles: Record<CardTone, string> = {
  paper: "bg-b-paper text-b-text-primary",
  raised: "bg-b-raised text-b-text-primary shadow-sm",
  ink: "bg-b-ink text-b-text-inverse",
  sunken: "bg-b-sunken text-b-text-primary",
};

const radiusMap: Record<CardRadius, string> = {
  sm: "rounded-[6px]",
  md: "rounded-[10px]",
  lg: "rounded-[14px]",
  xl: "rounded-[20px]",
  "2xl": "rounded-[28px]",
};

export default function Card({
  tone = "paper",
  radius = "lg",
  bordered = true,
  children,
  className = "",
  ...props
}: CardProps) {
  const borderClass =
    bordered && tone !== "ink" ? "border border-b-border-subtle" : "border border-transparent";
  return (
    <div
      className={`${borderClass} ${toneStyles[tone]} ${radiusMap[radius]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
