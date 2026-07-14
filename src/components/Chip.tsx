import React from "react";

type Tone = "accent" | "success" | "warning" | "danger" | "info" | "neutral" | "ink";

interface ChipProps {
  tone?: Tone;
  variant?: "soft" | "solid" | "outline";
  children: React.ReactNode;
  className?: string;
  as?: "span" | "button";
  onClick?: () => void;
  title?: string;
}

/** Chip — pill / tag / tone badge from Figma. */
export default function Chip({
  tone = "neutral",
  variant = "soft",
  children,
  className = "",
  as = "span",
  onClick,
  title,
}: ChipProps) {
  const styles = getStyles(tone, variant);
  const Tag: any = as;
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-[6px] mono-label transition-colors ${className}`}
      style={styles}
    >
      {children}
    </Tag>
  );
}

function getStyles(tone: Tone, variant: "soft" | "solid" | "outline") {
  const map = {
    accent:  { s: "var(--color-b-accent-soft)",  t: "var(--color-b-accent-text)", solid: "var(--color-b-accent)", solidT: "var(--color-b-text-on-accent)" },
    success: { s: "var(--color-b-success-soft)", t: "var(--color-b-success)",      solid: "var(--color-b-success)", solidT: "var(--color-b-text-inverse)" },
    warning: { s: "var(--color-b-warning-soft)", t: "var(--color-b-warning)",      solid: "var(--color-b-warning)", solidT: "var(--color-b-text-inverse)" },
    danger:  { s: "var(--color-b-danger-soft)",  t: "var(--color-b-danger)",       solid: "var(--color-b-danger)",  solidT: "var(--color-b-text-inverse)" },
    info:    { s: "var(--color-b-info-soft)",    t: "var(--color-b-info)",         solid: "var(--color-b-info)",    solidT: "var(--color-b-text-inverse)" },
    neutral: { s: "var(--color-b-sunken)",       t: "var(--color-b-text-tertiary)",solid: "var(--color-b-ink)",     solidT: "var(--color-b-text-inverse)" },
    ink:     { s: "var(--color-b-ink)",          t: "var(--color-b-text-inverse)", solid: "var(--color-b-ink)",     solidT: "var(--color-b-text-inverse)" },
  } as const;
  const c = map[tone];
  if (variant === "solid")   return { background: c.solid,   color: c.solidT };
  if (variant === "outline") return { background: "transparent", color: c.t, border: `1px solid ${c.t}` };
  return { background: c.s, color: c.t };
}
