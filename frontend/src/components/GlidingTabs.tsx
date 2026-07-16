"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";

export type GlidingTabItem = {
  key: string;
  label: string;
};

type Variant = "pill" | "underline";

export interface GlidingTabsProps {
  tabs: Array<GlidingTabItem | string>;
  /** Controlled active key (or string value if tabs are plain strings). */
  value?: string;
  defaultValue?: string;
  onChange?: (key: string) => void;
  /**
   * pill — floating ink capsule (filters / mode chips)
   * underline — accent bar under the active label (page sections)
   */
  variant?: Variant;
  className?: string;
  "aria-label"?: string;
}

function normalize(tabs: GlidingTabsProps["tabs"]): GlidingTabItem[] {
  return tabs.map((t) =>
    typeof t === "string" ? { key: t, label: t } : t
  );
}

/**
 * GlidingTabs — sliding indicator under the active toggle.
 * Use for every multi-option toggle / filter / mode switcher in Butler.
 */
export default function GlidingTabs({
  tabs: rawTabs,
  value,
  defaultValue,
  onChange,
  variant = "pill",
  className = "",
  "aria-label": ariaLabel = "Tabs",
}: GlidingTabsProps) {
  const tabs = normalize(rawTabs);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(
    defaultValue ?? value ?? tabs[0]?.key ?? ""
  );
  const active = controlled ? value! : internal;

  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState<CSSProperties>({
    opacity: 0,
  });

  const measure = useCallback(() => {
    const idx = tabs.findIndex((t) => t.key === active);
    const el = refs.current[idx >= 0 ? idx : 0];
    if (!el) {
      setIndicator((s) => ({ ...s, opacity: 0 }));
      return;
    }
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
      height: variant === "pill" ? el.offsetHeight : 2,
      top: variant === "pill" ? el.offsetTop : undefined,
      bottom: variant === "underline" ? 0 : undefined,
      opacity: 1,
    });
  }, [active, tabs, variant]);

  useEffect(() => {
    measure();
  }, [measure, tabs.map((t) => t.label).join("|")]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined" && trackRef.current
        ? new ResizeObserver(onResize)
        : null;
    if (trackRef.current && ro) ro.observe(trackRef.current);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [measure]);

  // Re-measure after fonts/layout settle
  useEffect(() => {
    const id = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(id);
  }, [measure]);

  const select = (key: string) => {
    if (!controlled) setInternal(key);
    onChange?.(key);
  };

  const glide =
    "left .4s cubic-bezier(.65,0,.35,1), width .4s cubic-bezier(.65,0,.35,1), top .4s cubic-bezier(.65,0,.35,1), opacity .2s ease";

  if (variant === "underline") {
    return (
      <div
        ref={trackRef}
        role="tablist"
        aria-label={ariaLabel}
        className={`relative flex flex-wrap gap-6 border-b border-b-border-subtle ${className}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bg-b-accent"
          style={{
            ...indicator,
            height: 2,
            transition: glide,
          }}
        />
        {tabs.map((t, i) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              ref={(el) => {
                refs.current[i] = el;
              }}
              onClick={() => select(t.key)}
              className={`relative pb-3 body-md-med transition-colors cursor-pointer ${
                isActive
                  ? "text-b-text-primary"
                  : "text-b-text-tertiary hover:text-b-text-secondary"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  // pill
  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex flex-wrap gap-1 p-1.5 rounded-full bg-b-sunken border border-b-border-subtle/60 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full bg-b-ink shadow-sm"
        style={{
          ...indicator,
          transition: glide,
        }}
      />
      {tabs.map((t, i) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => select(t.key)}
            className={`relative z-[1] px-3.5 py-2 rounded-full mono-label transition-colors cursor-pointer ${
              isActive
                ? "text-b-text-inverse"
                : "text-b-text-secondary hover:text-b-text-primary"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
