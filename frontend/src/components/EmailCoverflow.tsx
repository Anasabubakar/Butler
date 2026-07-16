"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { GmailMessage } from "@/types";
import { api } from "@/lib/api";
import Button from "./Button";

const PERSPECTIVE = 1600;
const SCALE_STEP = 0.14;
const MAX_VISIBLE = 2;
const DEPTH = 220;
const CARD_W = 340;
const CARD_H = 280;
const TILT = 11;
const SIDE_TILT = 7;
const GAP = 7;
const MOVE_DUR = 0.55;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function gmailOpenUrl(id: string) {
  // Opens the message in Gmail web (message id from Gmail API).
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(id)}`;
}

function formatMailDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(from: string) {
  const clean = (from || "?").replace(/<.*>/, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "?";
}

interface EmailCoverflowProps {
  emails: GmailMessage[];
  hasWorkspace: boolean;
  isLoading?: boolean;
  onDraftQueued?: (delegationId: string) => void;
  onOpenNotifications?: () => void;
}

export default function EmailCoverflow({
  emails,
  hasWorkspace,
  isLoading,
  onDraftQueued,
  onOpenNotifications,
}: EmailCoverflowProps) {
  const n = emails.length;
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    setActive((a) => Math.max(0, Math.min(Math.max(n - 1, 0), a)));
  }, [n]);

  const lock = useCallback(() => {
    lockRef.current = true;
    window.setTimeout(() => {
      lockRef.current = false;
    }, Math.max(50, MOVE_DUR * 1000));
  }, []);

  const step = useCallback(
    (dir: number) => {
      if (n < 1 || lockRef.current) return;
      lock();
      setActive((a) => (((a + dir) % n) + n) % n);
      setStatus(null);
    },
    [n, lock]
  );

  const handleCardClick = useCallback(
    (i: number) => {
      if (lockRef.current) return;
      lock();
      setActive((a) => (i === a ? (a + 1) % n : i));
      setStatus(null);
    },
    [n, lock]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    },
    [step]
  );

  const current = n > 0 ? emails[active] : null;

  const showEmail = () => {
    if (!current) return;
    window.open(gmailOpenUrl(current.id), "_blank", "noopener,noreferrer");
  };

  const draftReply = async () => {
    if (!current || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const title = `Reply to ${current.from} · ${current.subject}`;
      const draft = [
        `Boss — draft reply to ${current.from}`,
        `Re: ${current.subject}`,
        "",
        `// original: ${current.snippet || "(no preview)"}`,
        "",
        "Thanks for your note — I'll follow up properly once I've reviewed the details.",
        "",
        "— drafted by Butler (awaiting your approval)",
      ].join("\n");
      const d = await api.delegations.create({
        title,
        service: "Gmail",
        context: current.from,
        draft,
        tone: "accent",
        toneLabel: "draft · awaiting send",
      });
      setStatus("Draft queued for approval.");
      onDraftQueued?.(d.id);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not queue draft");
    } finally {
      setBusy(false);
    }
  };

  const dim = 1 - 60 / 100; // match Originkit opacity 60
  const transitionCss = `transform ${MOVE_DUR}s ${EASE}, opacity ${MOVE_DUR}s ${EASE}`;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <div className="mono-label text-b-accent-text mb-1">
            Inbox · coverflow · {n}
          </div>
          <h3 className="type-h3 text-b-text-primary">Recent mail.</h3>
          <p className="body-sm text-b-text-tertiary mt-1">
            Flip through messages. Open in Gmail, queue a reply, or skip ahead.
          </p>
        </div>
        {n > 0 && (
          <p className="mono-sm text-b-text-tertiary">
            {active + 1} / {n} · ← → keys
          </p>
        )}
      </div>

      {isLoading && n === 0 && (
        <p className="body-sm text-b-text-tertiary animate-pulse py-16 text-center">
          Loading inbox…
        </p>
      )}

      {!isLoading && n === 0 && (
        <div className="rounded-[14px] border border-dashed border-b-border-default bg-b-sunken/40 px-6 py-14 text-center">
          <p className="body-md text-b-text-secondary">
            {hasWorkspace
              ? "Your inbox is quiet, Boss."
              : "Connect Google Workspace to load Gmail."}
          </p>
        </div>
      )}

      {n > 0 && (
        <>
          <div
            className="relative w-full outline-none select-none"
            style={{
              minHeight: CARD_H + 80,
              height: Math.max(360, CARD_H + 100),
              perspective: `${PERSPECTIVE}px`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label="Inbox coverflow"
            onKeyDown={onKeyDown}
          >
            <div
              style={{
                position: "relative",
                width: CARD_W,
                height: CARD_H,
                transformStyle: "preserve-3d",
              }}
            >
              {emails.map((mail, i) => {
                let rel = i - active;
                if (rel > n / 2) rel -= n;
                if (rel < -n / 2) rel += n;
                const ax = Math.abs(rel);
                const visible = ax <= MAX_VISIBLE;
                const isActive = rel === 0;
                const sc = Math.max(0.45, 1 - ax * SCALE_STEP);
                const tx = rel * (GAP * 30);
                const tz = -ax * DEPTH;
                const ry = -rel * TILT;
                const rz = rel * SIDE_TILT;

                const cardStyle: CSSProperties = {
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 14,
                  overflow: "hidden",
                  transformStyle: "preserve-3d",
                  transformOrigin: "center center",
                  transform: `translate(-50%, -50%) translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`,
                  transition: transitionCss,
                  opacity: visible ? 1 : 0,
                  cursor: isActive ? "default" : "pointer",
                  pointerEvents: visible ? "auto" : "none",
                  background:
                    "linear-gradient(165deg, #FBF7EF 0%, #F5EFE6 55%, #EBE3D6 100%)",
                  border: "1px solid rgba(213,199,176,0.9)",
                  boxShadow: isActive
                    ? "0 18px 40px rgba(28,24,21,0.18)"
                    : "0 10px 24px rgba(28,24,21,0.12)",
                };

                return (
                  <div
                    key={mail.id}
                    style={cardStyle}
                    onClick={() => handleCardClick(i)}
                    aria-label={`${mail.from}: ${mail.subject}`}
                    aria-hidden={!visible}
                  >
                    <div className="relative h-full flex flex-col p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-11 h-11 rounded-[10px] shrink-0 flex items-center justify-center mono-label text-b-text-inverse"
                          style={{ background: "#1C1815" }}
                        >
                          {initials(mail.from)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="body-md-med text-b-text-primary truncate">
                            {mail.from || "Unknown"}
                          </p>
                          <p className="mono-sm text-b-text-tertiary mt-0.5">
                            {formatMailDate(mail.date)}
                          </p>
                        </div>
                        <span className="mono-label text-b-accent-text shrink-0">
                          MAIL
                        </span>
                      </div>

                      <h4
                        className="text-[18px] leading-snug text-b-text-primary mb-2 line-clamp-2"
                        style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
                      >
                        {mail.subject || "(No subject)"}
                      </h4>

                      <p className="body-sm text-b-text-secondary leading-relaxed line-clamp-5 flex-1">
                        {mail.snippet || "No preview available."}
                      </p>

                      <div className="mt-3 pt-3 border-t border-b-border-subtle flex items-center justify-between">
                        <span className="mono-sm text-b-text-tertiary">
                          {isActive ? "in focus" : "click to focus"}
                        </span>
                        <span className="mono-sm text-b-text-tertiary">
                          {i + 1}/{n}
                        </span>
                      </div>
                    </div>

                    {/* Dim inactive cards */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "#1C1815",
                        opacity: isActive ? 0 : dim * 0.55,
                        transition: `opacity ${MOVE_DUR}s ${EASE}`,
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Button
              size="md"
              variant="primary"
              onClick={showEmail}
              disabled={!current}
            >
              Show email
            </Button>
            <Button
              size="md"
              variant="accent"
              onClick={() => void draftReply()}
              disabled={!current || busy}
            >
              {busy ? "Queuing…" : "Draft reply"}
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => step(1)}
              disabled={n < 2}
            >
              Next →
            </Button>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={n < 2}
              className="px-3 py-2 mono-label text-b-text-secondary hover:text-b-text-primary cursor-pointer disabled:opacity-40"
            >
              ← Prev
            </button>
          </div>

          {status && (
            <p
              className="body-sm text-center mt-3 text-b-accent-text"
              role="status"
            >
              {status}
              {status.toLowerCase().includes("queued") && onDraftQueued && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="underline mono-label cursor-pointer"
                    onClick={() => onDraftQueued("")}
                  >
                    Review in Delegated Work →
                  </button>
                </>
              )}
            </p>
          )}

          {current && (
            <p className="body-sm text-center mt-2 text-b-text-tertiary max-w-xl mx-auto truncate">
              Focus: <span className="text-b-text-secondary">{current.from}</span>
              {" · "}
              {current.subject}
            </p>
          )}
        </>
      )}

      {onOpenNotifications && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="body-sm-med text-b-accent-text hover:underline cursor-pointer"
          >
            Open notifications desk →
          </button>
        </div>
      )}
    </div>
  );
}
