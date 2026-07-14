import React from "react";
import ButlerLogo from "./ButlerLogo";
import Button from "./Button";

interface AuthScreenProps {
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
  isSigningIn: boolean;
  error: string | null;
}

/**
 * Auth Screen — pixel implementation of the Figma "05 · Auth" frame.
 * Left column: brand + editorial serif headline + Google sign-in + scope card + footer.
 * Right column: dark surface with a rotated cream note from Butler.
 */
export default function AuthScreen({ onGoogleSignIn, onDemoSignIn, isSigningIn, error }: AuthScreenProps) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* ================= LEFT — SIGN-IN COLUMN ================= */}
      <div
        className="flex flex-col justify-center px-8 sm:px-16 lg:px-[120px] py-16 lg:py-16"
        style={{ background: "var(--color-b-canvas)" }}
      >
        <div className="max-w-[520px] w-full mx-auto lg:mx-0 flex flex-col gap-10">
          {/* Brand row */}
          <div className="flex items-center gap-3">
            <ButlerLogo size={32} variant="dark" />
            <span className="h-3 font-serif" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600, color: "var(--color-b-text-primary)" }}>
              Butler
            </span>
          </div>

          {/* Eyebrow */}
          <div className="label-sm" style={{ color: "var(--color-b-accent-text)" }}>
            Private beta · by invitation
          </div>

          {/* Headline — mixed italic */}
          <h1 className="display-m" style={{ color: "var(--color-b-text-primary)" }}>
            Good to see <em className="display-italic not-italic" style={{ fontStyle: "italic", color: "var(--color-b-accent-text)" }}>you, Boss.</em>
          </h1>

          {/* Sub */}
          <p className="body-lg" style={{ color: "var(--color-b-text-secondary)" }}>
            Sign in with the Google account that carries your day. Butler will
            ask permission for the services you want it to touch — never more than you grant.
          </p>

          {/* Primary Google button */}
          <button
            onClick={onGoogleSignIn}
            disabled={isSigningIn}
            className="w-full rounded-[10px] flex items-center gap-4 px-6 py-[18px] transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            style={{ background: "var(--color-b-ink)", color: "var(--color-b-text-inverse)" }}
          >
            {/* Google mark */}
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-b-text-inverse)" }}
            >
              <svg width="14" height="14" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </span>
            <span className="flex-1 text-left body-md-med">
              {isSigningIn ? "Opening Google…" : "Continue with Google Workspace"}
            </span>
            <span aria-hidden="true" className="body-md-med">→</span>
          </button>

          {/* Error message (kept from previous flow so nothing regresses) */}
          {error && (
            <div
              className="rounded-[10px] p-4 body-sm"
              style={{ background: "var(--color-b-danger-soft)", color: "var(--color-b-danger)" }}
            >
              <span className="mono-label block mb-1">Connection restricted</span>
              {error}
              <div className="mt-2" style={{ color: "var(--color-b-text-secondary)" }}>
                Some browsers block OAuth popups inside iframes. Try Simulator Mode below.
              </div>
            </div>
          )}

          {/* Scope card — sober checklist */}
          <div
            className="rounded-[14px] px-6 py-5 flex flex-col gap-3"
            style={{ background: "var(--color-b-paper)", border: "1px solid var(--color-b-border-subtle)" }}
          >
            <div className="mono-label" style={{ color: "var(--color-b-text-tertiary)" }}>
              Butler will request
            </div>
            {SCOPES.map(([svc, desc]) => (
              <div key={svc} className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-b-accent-soft)" }}
                >
                  <span className="mono-sm" style={{ color: "var(--color-b-accent-text)" }}>✓</span>
                </span>
                <span className="body-sm-med w-[132px] flex-shrink-0" style={{ color: "var(--color-b-text-primary)" }}>{svc}</span>
                <span className="body-sm flex-1" style={{ color: "var(--color-b-text-tertiary)" }}>{desc}</span>
              </div>
            ))}
          </div>

          <div className="body-sm-med" style={{ color: "var(--color-b-accent-text)" }}>
            + Add GitHub, Notion, Slack, Linear, Jira, Figma later
          </div>

          {/* Simulator + footer */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onDemoSignIn}
              className="body-sm-med underline-offset-4 hover:underline transition-all text-left"
              style={{ color: "var(--color-b-accent-text)" }}
            >
              Enter Simulator Mode — no account needed
            </button>
            <div className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
              New here?  Request an invite  ·  Trust &amp; Security  ·  Terms
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT — DARK NOTE COLUMN ================= */}
      <div
        className="relative overflow-hidden hidden lg:block dark-scope"
        style={{ background: "var(--color-b-ink)", color: "var(--color-b-text-inverse)" }}
      >
        <div className="label-sm absolute top-14 left-14" style={{ color: "var(--color-b-accent-text)" }}>
          A glimpse of what awaits
        </div>

        {/* Rotated note card */}
        <div
          className="absolute rounded-[14px] p-10"
          style={{
            width: 440,
            top: 170,
            left: 140,
            background: "var(--color-b-canvas)",
            color: "var(--color-b-text-primary)",
            transform: "rotate(-3deg)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          }}
        >
          <h2 className="h-2 flourish mb-2" style={{ color: "var(--color-b-text-primary)" }}>A brief for you, Boss.</h2>
          <div className="mono-label mb-6" style={{ color: "var(--color-b-text-tertiary)" }}>
            13 July  ·  07:04
          </div>
          <div className="body-md flex flex-col gap-4" style={{ color: "var(--color-b-text-secondary)" }}>
            <p>Overnight, three things moved.</p>
            <p>Kai replied about the deck — I drafted your response; it's dry and warm, ready when you nod.</p>
            <p>Meridian shifted the deploy window into your 10 AM. I moved you to 10:45 and told them why in your voice.</p>
            <p>Tomorrow's board pack is 62% ready. I marked the two paragraphs that need your fingerprint — everything else is done.</p>
          </div>
          <div className="mt-6 flourish text-right" style={{ color: "var(--color-b-accent-text)" }}>
            — Butler
          </div>
        </div>
      </div>
    </div>
  );
}

const SCOPES: Array<[string, string]> = [
  ["Gmail",              "read, draft, send in your voice"],
  ["Calendar",           "see, hold, and negotiate windows"],
  ["Drive & Docs",       "read, write, organize files"],
  ["Tasks & Contacts",   "remember people, keep the ledger"],
];
