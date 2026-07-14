import React from "react";
import ButlerLogo from "./ButlerLogo";
import Button from "./Button";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "var(--color-b-canvas)" }}
    >
      {/* NAV BAR */}
      <header className="w-full flex items-center justify-between px-8 sm:px-16 lg:px-[120px] py-6">
        <div className="flex items-center gap-3">
          <ButlerLogo size={28} variant="dark" />
          <span
            className="font-serif"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--color-b-text-primary)",
            }}
          >
            Butler
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="body-sm-med hidden sm:block" style={{ color: "var(--color-b-text-secondary)" }}>
            Features
          </a>
          <a href="#how" className="body-sm-med hidden sm:block" style={{ color: "var(--color-b-text-secondary)" }}>
            How it works
          </a>
          <Button variant="primary" size="sm" onClick={onGetStarted}>
            Sign in
          </Button>
        </div>
      </header>

      {/* HERO */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 sm:px-16 lg:px-[120px] pb-20">
        <div className="max-w-[720px] text-center flex flex-col items-center gap-8">
          <div
            className="label-sm"
            style={{ color: "var(--color-b-accent-text)" }}
          >
            Private beta · by invitation
          </div>

          <h1
            className="display-xl"
            style={{ color: "var(--color-b-text-primary)" }}
          >
            Your digital{" "}
            <em
              className="display-italic not-italic"
              style={{
                fontStyle: "italic",
                color: "var(--color-b-accent-text)",
              }}
            >
              chief of staff.
            </em>
          </h1>

          <p
            className="body-lg max-w-[560px]"
            style={{ color: "var(--color-b-text-secondary)" }}
          >
            Butler connects your calendar, inbox, docs, code, and conversations
            into one calm surface — then acts on your behalf, in your voice,
            with your permission.
          </p>

          <div className="flex items-center gap-4 mt-4">
            <Button variant="accent" size="lg" onClick={onGetStarted}>
              Get started
            </Button>
            <Button variant="ghost" size="lg" onClick={onGetStarted}>
              Learn more
            </Button>
          </div>

          {/* Service strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
            {SERVICES.map((s) => (
              <span key={s} className="mono-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* BRIEF PREVIEW CARD */}
        <div
          className="mt-16 w-full max-w-[600px] rounded-[14px] p-10 relative"
          style={{
            background: "var(--color-b-ink)",
            color: "var(--color-b-text-inverse)",
            boxShadow: "0 20px 60px rgba(28,24,21,0.15)",
            transform: "rotate(-1deg)",
          }}
        >
          <h2
            className="h-2 flourish mb-2"
            style={{ color: "var(--color-b-text-inverse)" }}
          >
            A brief for you, Boss.
          </h2>
          <div
            className="mono-label mb-6"
            style={{ color: "var(--color-b-text-tertiary)" }}
          >
            13 July · 07:04
          </div>
          <div
            className="body-md flex flex-col gap-4"
            style={{ color: "rgba(245,239,230,0.7)" }}
          >
            <p>Overnight, three things moved.</p>
            <p>
              Kai replied about the deck — I drafted your response; it's dry and
              warm, ready when you nod.
            </p>
            <p>
              Meridian shifted the deploy window into your 10 AM. I moved you to
              10:45 and told them why in your voice.
            </p>
            <p>
              Tomorrow's board pack is 62% ready. I marked the two paragraphs
              that need your fingerprint — everything else is done.
            </p>
          </div>
          <div
            className="mt-6 flourish text-right"
            style={{ color: "var(--color-b-accent)" }}
          >
            — Butler
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        className="w-full px-8 sm:px-16 lg:px-[120px] py-8 border-t"
        style={{ borderColor: "var(--color-b-border-subtle)" }}
      >
        <div className="flex items-center justify-between">
          <div className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
            Butler · Digital Chief of Staff
          </div>
          <div className="body-sm" style={{ color: "var(--color-b-text-tertiary)" }}>
            Trust & Security · Terms · Privacy
          </div>
        </div>
      </footer>
    </div>
  );
}

const SERVICES = [
  "Gmail",
  "Calendar",
  "Drive",
  "GitHub",
  "Slack",
  "Notion",
  "Linear",
  "Jira",
  "Figma",
];
