import React from "react";

type CardTone = "paper" | "raised" | "ink" | "sunken";

interface CardProps {
  children: React.ReactNode;
  tone?: CardTone;
  className?: string;
  bordered?: boolean;
  radius?: "sm" | "md" | "lg" | "xl" | "2xl";
  style?: React.CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}

/** Card — matches Figma's card surface treatment across all screens. */
export default function Card({
  children,
  tone = "paper",
  className = "",
  bordered = true,
  radius = "lg",
  style,
  onClick,
  ariaLabel,
}: CardProps) {
  const bg = {
    paper: "var(--color-b-paper)",
    raised: "var(--color-b-raised)",
    ink: "var(--color-b-ink)",
    sunken: "var(--color-b-sunken)",
  }[tone];

  const border = tone === "ink" ? "transparent" : "var(--color-b-border-subtle)";

  const r = {
    sm: 6, md: 10, lg: 14, xl: 20, "2xl": 28,
  }[radius];

  return (
    <div
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${className}`}
      style={{
        background: bg,
        border: bordered ? `1px solid ${border}` : "none",
        borderRadius: r,
        color: tone === "ink" ? "var(--color-b-text-inverse)" : "var(--color-b-text-primary)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
