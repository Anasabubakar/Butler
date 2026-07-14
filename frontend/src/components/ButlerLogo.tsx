"use client";

interface ButlerLogoProps {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
}

export default function ButlerLogo({ size = 40, variant = "dark", className = "" }: ButlerLogoProps) {
  const fill = variant === "dark" ? "var(--color-b-ink)" : "var(--color-b-paper)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill={fill} />
      <path
        d="M12 10h8c2.2 0 4 .8 5.1 2 1 1 1.5 2.4 1.5 4 0 1.3-.4 2.5-1.1 3.4-.5.6-1.1 1.1-1.9 1.5.9.3 1.7.8 2.3 1.5.9 1 1.4 2.4 1.4 4 0 1.7-.6 3.2-1.7 4.2C24.4 31.7 22.4 32.5 20 32.5H12V10Zm4 3.5v5.5h4c1 0 1.8-.3 2.3-.8.5-.5.8-1.2.8-2s-.3-1.5-.8-2c-.5-.5-1.3-.8-2.3-.8h-4Zm0 9v6.5h4.5c1.1 0 2-.3 2.6-.9.6-.6.9-1.4.9-2.4 0-1-.3-1.8-.9-2.4-.6-.6-1.5-.9-2.6-.9H16Z"
        fill={variant === "dark" ? "var(--color-b-paper)" : "var(--color-b-ink)"}
      />
    </svg>
  );
}
