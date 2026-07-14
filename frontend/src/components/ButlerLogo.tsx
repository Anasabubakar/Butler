"use client";

interface ButlerLogoProps {
  size?: number;
  variant?: "dark" | "light" | "gold" | "default";
  className?: string;
}

const VARIANT_SRC: Record<string, string> = {
  dark: "/images/logo-dark-nobg.svg",
  light: "/images/logo-white-nobg.svg",
  gold: "/images/logo-gold-nobg.svg",
  default: "/images/logo.svg",
};

export default function ButlerLogo({ size = 40, variant = "dark", className = "" }: ButlerLogoProps) {
  return (
    <img
      src={VARIANT_SRC[variant]}
      alt="Butler"
      height={size}
      style={{ height: size, width: "auto" }}
      className={className}
    />
  );
}
