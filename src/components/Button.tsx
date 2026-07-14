import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  title?: string;
  ariaLabel?: string;
}

/** Butler Button — variants mirror Figma exactly (dark ink, outline, accent, ghost). */
export default function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  className = "",
  type = "button",
  disabled,
  full,
  title,
  ariaLabel,
}: ButtonProps) {
  const sizeCls =
    size === "sm" ? "px-3 py-1.5 body-sm-med" :
    size === "lg" ? "px-6 py-4 body-md-med" :
    "px-5 py-2.5 body-sm-med";

  const style: React.CSSProperties = (() => {
    switch (variant) {
      case "primary":
        return { background: "var(--color-b-ink)", color: "var(--color-b-text-inverse)" };
      case "accent":
        return { background: "var(--color-b-accent)", color: "var(--color-b-text-on-accent)" };
      case "secondary":
        return {
          background: "transparent",
          color: "var(--color-b-text-primary)",
          border: "1px solid var(--color-b-border-strong)",
        };
      case "ghost":
        return { background: "transparent", color: "var(--color-b-text-primary)" };
    }
  })();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.98] whitespace-nowrap ${sizeCls} ${full ? "w-full" : ""} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
