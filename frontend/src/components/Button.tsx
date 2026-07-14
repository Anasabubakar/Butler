"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-b-ink text-b-text-inverse hover:opacity-90",
  accent:
    "bg-b-accent text-b-text-on-accent hover:opacity-90",
  secondary:
    "border border-b-border-default text-b-text-primary bg-transparent hover:bg-b-sunken",
  ghost:
    "text-b-text-secondary bg-transparent hover:bg-b-sunken",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[13px] rounded-[6px] gap-1.5",
  md: "px-4 py-2 text-[15px] rounded-[10px] gap-2",
  lg: "px-5 py-2.5 text-[15px] rounded-[14px] gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
