import React from "react";

interface ButlerLogoProps {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
}

/**
 * ButlerLogo — Rounded-square logomark from the Figma brand assets.
 * The Figma vector is a blob-shaped "B" with a companion satellite dot.
 * The variants match: dark (ink square, cream mark) and light (paper square, ink mark).
 */
export default function ButlerLogo({ size = 32, variant = "dark", className = "" }: ButlerLogoProps) {
  const bg   = variant === "dark" ? "#1C1815" : "#F5EFE6";
  const mark = variant === "dark" ? "#F5EFE6" : "#1C1815";
  const inv  = variant === "dark" ? "#1C1815" : "#F5EFE6";
  const radius = Math.round(size * 0.24);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx={radius / (size / 64)} fill={bg} />
      {/* B-shape blob composed from a large lobe + smaller lobe + satellite */}
      <path
        d="M32 14
           C 41 14, 47 19, 47 26.5
           C 47 30, 45 32.5, 42.5 34
           C 46 35.5, 48.5 38.5, 48.5 43
           C 48.5 50, 42.5 55, 33 55
           C 24 55, 19 51, 19 45
           L 19 30
           C 19 20, 24.5 14, 32 14 Z"
        fill={mark}
      />
      {/* Punched circle inside the top lobe (creates B-negative-space feel) */}
      <circle cx="33" cy="27.5" r="4.5" fill={bg} />
      {/* Punched circle inside the bottom lobe */}
      <circle cx="33" cy="44" r="5.5" fill={bg} />
      {/* Satellite dot (the "eye") */}
      <circle cx="16" cy="36" r="3.6" fill={mark} />
      {/* Inner counter of satellite to show negative-space */}
      <circle cx="16" cy="36" r="1.2" fill={inv} />
    </svg>
  );
}
