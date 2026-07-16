"use client";

import { useState, useRef, type FormEvent, type KeyboardEvent } from "react";
import Icon from "./Icon";

export interface ExpandingSearchProps {
  placeholder?: string;
  /** Collapsed width in px */
  collapsedWidth?: number;
  /** Expanded width in px */
  expandedWidth?: number;
  defaultValue?: string;
  /** Called when user submits (Enter). */
  onSearch?: (query: string) => void;
  /** Optional class for outer shell */
  className?: string;
  "aria-label"?: string;
}

/**
 * ExpandingSearch — icon pill that grows on focus (Originkit pattern).
 * Width animates 56 → 230 (configurable) with a soft ease.
 */
export default function ExpandingSearch({
  placeholder = "Search…",
  collapsedWidth = 56,
  expandedWidth = 230,
  defaultValue = "",
  onSearch,
  className = "",
  "aria-label": ariaLabel = "Search",
}: ExpandingSearchProps) {
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const expanded = focused || value.trim().length > 0;
  const width = expanded ? expandedWidth : collapsedWidth;

  const submit = (q?: string) => {
    const query = (q ?? value).trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    onSearch?.(query);
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setValue("");
      inputRef.current?.blur();
    }
  };

  return (
    <form
      onSubmit={onFormSubmit}
      className={`relative flex items-center h-11 rounded-[10px] bg-b-paper border border-b-border-subtle overflow-hidden shrink-0 ${className}`}
      style={{
        width,
        transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        // Stay expanded if focus moves inside the form
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      role="search"
      aria-label={ariaLabel}
    >
      <button
        type="submit"
        className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-b-text-tertiary hover:text-b-text-primary cursor-pointer z-[1]"
        aria-label="Search"
        tabIndex={-1}
        onClick={() => {
          if (!expanded) inputRef.current?.focus();
        }}
      >
        <Icon name="search" size={18} />
      </button>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full h-full bg-transparent pl-12 pr-3 body-sm text-b-text-primary placeholder:text-b-text-tertiary outline-none"
        style={{
          opacity: expanded ? 1 : 0,
          transition: "opacity 0.25s ease",
          // Avoid accidental interaction when collapsed
          pointerEvents: expanded ? "auto" : "none",
        }}
        aria-label={ariaLabel}
      />
    </form>
  );
}
