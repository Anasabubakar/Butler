"use client";

import { motion } from "framer-motion";
import ButlerLogo from "./ButlerLogo";
import { fadeUp, usePrefersReducedMotion } from "@/lib/motion";

interface AuthScreenProps {
  onSignIn: () => void;
  error?: string;
  isSigningIn?: boolean;
}

const SCOPES: Array<[string, string]> = [
  ["Gmail", "read, draft, send in your voice"],
  ["Calendar", "see, hold, and negotiate windows"],
  ["Drive & Docs", "read, write, organize files"],
  ["Tasks & Contacts", "remember people, keep the ledger"],
];

const NOTE_PARAGRAPHS = [
  "Overnight, three things moved.",
  "Kai replied about the deck — I drafted your response; it's dry and warm, ready when you nod.",
  "Meridian shifted the deploy window into your 10 AM. I moved you to 10:45 and told them why in your voice.",
  "Tomorrow's board pack is 62% ready. I marked the two paragraphs that need your fingerprint — everything else is done.",
];

export default function AuthScreen({
  onSignIn,
  isSigningIn = false,
  error,
}: AuthScreenProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-b-canvas">
      {/* Left — sign in */}
      <motion.div
        className="flex flex-col justify-center px-8 sm:px-16 lg:pl-[120px] lg:pr-20 py-16"
        initial={reducedMotion ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        <div className="max-w-[520px] w-full flex flex-col gap-10">
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <ButlerLogo size={32} variant="dark" />
            <span className="type-h3 text-b-text-primary">Butler</span>
          </motion.div>

          <motion.p variants={fadeUp} className="label-sm text-b-accent-text tracking-[0.12em]">
            PRIVATE BETA · BY INVITATION
          </motion.p>

          <motion.h1 variants={fadeUp} className="display-m text-b-text-primary">
            Good to see{" "}
            <em className="display-italic text-b-accent-text not-italic" style={{ fontStyle: "italic" }}>
              you, Boss.
            </em>
          </motion.h1>

          <motion.p variants={fadeUp} className="body-lg text-b-text-secondary">
            Sign in with the Google account that carries your day. Butler will
            ask permission for the services you want it to touch — never more than you grant.
          </motion.p>

          <motion.button
            variants={fadeUp}
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="w-full rounded-[10px] flex items-center gap-3.5 px-6 py-[18px] bg-b-ink text-b-text-inverse transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded-full flex items-center justify-center bg-b-text-inverse shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            <span className="flex-1 text-left body-md-med">
              {isSigningIn ? "Opening Google…" : "Continue with Google Workspace"}
            </span>
            <span aria-hidden="true" className="body-md-med">→</span>
          </motion.button>

          {error && (
            <motion.div
              variants={fadeUp}
              className="rounded-[10px] p-4 body-sm bg-b-danger-soft text-b-danger"
              role="alert"
            >
              <span className="mono-label block mb-1 text-b-danger">Sign-in failed</span>
              {error}
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            className="rounded-[14px] px-6 py-5 flex flex-col gap-3 bg-b-paper border border-b-border-subtle"
          >
            <div className="mono-label text-b-text-tertiary">Butler will request</div>
            {SCOPES.map(([svc, desc]) => (
              <div key={svc} className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0 bg-b-accent-soft"
                >
                  <span className="mono-sm text-b-accent-text">✓</span>
                </span>
                <span className="body-sm-med w-[140px] shrink-0 text-b-text-primary">{svc}</span>
                <span className="body-sm flex-1 text-b-text-tertiary">{desc}</span>
              </div>
            ))}
          </motion.div>

          <motion.p variants={fadeUp} className="body-sm-med text-b-accent-text pt-2">
            + Add GitHub, Notion, Slack, Linear, Jira, Figma later
          </motion.p>

          <motion.p variants={fadeUp} className="body-sm text-b-text-tertiary">
            New here? Request an invite · Trust &amp; Security · Terms
          </motion.p>
        </div>
      </motion.div>

      {/* Right — Butler note */}
      <div className="relative hidden lg:block bg-b-ink overflow-hidden min-h-[480px] lg:min-h-screen">
        <p className="label-sm text-b-accent-text tracking-[0.12em] absolute top-14 left-14">
          A GLIMPSE OF WHAT AWAITS
        </p>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, rotate: 0, y: 12 }}
          animate={{ opacity: 1, rotate: 3, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="absolute top-[170px] left-[110px] w-[440px] rounded-[14px] bg-b-canvas text-b-text-primary p-10 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
        >
          <h2
            className="text-[24px] leading-[30px] tracking-[-0.12px] text-b-text-primary mb-2"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            A brief for you, Boss.
          </h2>
          <p className="mono-label text-b-text-tertiary mb-6">13 JULY · 07:04</p>
          <div className="body-md text-b-text-secondary flex flex-col gap-4">
            {NOTE_PARAGRAPHS.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <p
            className="mt-6 text-right text-[20px] text-b-accent-text"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            — Butler
          </p>
        </motion.div>
      </div>
    </div>
  );
}