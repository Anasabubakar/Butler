"use client";

import Button from "./Button";

interface LandingPageProps {
  onGetStarted: () => void;
}

const PARTNERS = [
  "Inbox Studio",
  "North & Park",
  "Alexandra Labs",
  "Founded 27",
  "Calendarize",
  "Nighthaven Co.",
];

const FEATURES = [
  {
    title: "Reads everything.",
    description:
      "Email, Docs, Drive, Notion pages, Slack threads, GitHub PRs, Linear tickets, the scope — Butler ingests content you don't have to. So, read the state of the desk and get one honest sentence.",
  },
  {
    title: "Writes in your voice.",
    description:
      "Drafts replies, memos, PR comments, meeting notes, and long docs in the exact register you use with each person. It's subtle prior to your last thousand messages — never on generic prose.",
  },
  {
    title: "Sees the calendar as a room.",
    description:
      "Detects conflicts before you do, holds windows for focus, negotiates reschedules one email in your tone, and preps the moment before you walk in — with three bullet points on that person.",
  },
  {
    title: "Moves through the day with you.",
    description:
      "Wherever you are on the planet — Lagos, Lisbon, Tokyo, a train in the Alps — Butler pulls the right timezone, the right format, the right cultural register. Location aware, never location assuming.",
  },
];

const INTEGRATIONS = [
  ["Gmail", "Google Cal", "Google Drive", "Google Docs", "Google Slides"],
  ["GitHub", "Notion", "Slack", "Linear", "Jira"],
  ["Figma", "Zapier", "Discord", "Zoom", "Maps"],
];

const TIMELINE = [
  {
    time: "06 : 30",
    title: "The house wakes up.",
    description:
      "Butler reads overnight mail, slack, drafts the first three replies in your voice, and sorts the last twelve hours of Slack, Notion, Linear, and GitHub to a priority that reads your fingerprint.",
  },
  {
    time: "07 : 00",
    title: "The morning brief.",
    description:
      "One page, one screen, one voice. What changed, what needs you, what Butler already handled. You approve and keep moving over your pour over.",
  },
  {
    time: "11 : 30",
    title: "A meeting shifts.",
    description:
      "A Monday 11am window collides with your 1 PM. Butler negotiates the reschedule one email, updates the calendar and pings the Slack of the reschedule — doc, warm, and fair.",
  },
  {
    time: "05 : 30",
    title: "A gentle close.",
    description:
      "An evening brief, what tomorrow looks, and tomorrow's emails, and a soft handoff. Butler prepares your from three files, dims the notifications, and quietly steps back.",
  },
];

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Services", href: "#features" },
  { label: "The Brief", href: "#timeline" },
  { label: "Pricing", href: "#cta" },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-b-canvas">
      {/* ──── Navigation ──── */}
      <nav className="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/logo-dark-nobg.svg"
            alt="Butler"
            className="h-7 w-auto"
          />
          <span className="h-4">Butler</span>
        </div>

        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="body-sm text-b-text-secondary hover:text-b-text-primary transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="body-sm text-b-text-secondary hover:text-b-text-primary transition-colors hidden sm:inline"
            >
              Sign in
            </a>
            <Button variant="accent" size="sm" onClick={onGetStarted}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ──── Hero ──── */}
      <section className="px-6 pt-12 md:pt-20 pb-20 text-center max-w-4xl mx-auto">
        <p className="label-md text-b-accent-text mb-6 tracking-widest">
          A Digital Chief of Staff
        </p>

        <h1>
          <span className="display-m md:display-l lg:display-xl block">
            Your day, quietly
          </span>
          <span
            className="display-m md:display-l lg:display-xl block"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            orchestrated.
          </span>
        </h1>

        <p className="body-lg text-b-text-secondary mt-8 max-w-2xl mx-auto leading-relaxed">
          Butler is your calm interface that reads, writes, and moves across your
          Google Workspace, GitHub, Notion, Slack, Linear, Figma — every tool
          where your work lives. It anticipates conflicts, drafts your replies,
          prepares your files, and hands you a morning brief. Not another
          dashboard. A staff of one, always in control.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Button variant="primary" size="lg" onClick={onGetStarted}>
            Begin with Butler &rarr;
          </Button>
          <Button variant="secondary" size="lg">
            Watch the brief 2:14
          </Button>
        </div>
      </section>

      {/* ──── Partners strip ──── */}
      <div className="border-y border-b-border-subtle py-4 overflow-hidden">
        <div className="flex items-center justify-center gap-8 md:gap-12 max-w-5xl mx-auto px-6 flex-wrap">
          {PARTNERS.map((name) => (
            <span
              key={name}
              className="body-sm text-b-text-tertiary whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ──── Command Center Preview ──── */}
      <section className="px-6 py-20 md:py-28 max-w-5xl mx-auto">
        <p className="label-md text-b-text-tertiary text-center mb-4 tracking-widest">
          A Glimpse
        </p>
        <h2 className="display-s md:display-m text-center max-w-2xl mx-auto">
          The Command Center — your morning at a glance.
        </h2>

        <div className="mt-10 md:mt-14 rounded-[20px] border border-b-border-subtle bg-b-paper p-1 shadow-xl">
          <div className="rounded-[16px] bg-b-raised overflow-hidden">
            <div className="flex min-h-[340px]">
              {/* Sidebar mock */}
              <div className="w-44 border-r border-b-border-subtle p-4 hidden md:block bg-b-paper">
                <div className="flex items-center gap-2 mb-6">
                  <img
                    src="/images/logo-dark-nobg.svg"
                    alt=""
                    className="h-5 w-auto"
                  />
                  <span className="body-sm-med">Butler</span>
                </div>
                {[
                  "Command Center",
                  "The Brief",
                  "Conversations",
                  "Delegated Work",
                  "Notifications",
                  "Voice & Memory",
                  "Integrations",
                ].map((item, i) => (
                  <div
                    key={item}
                    className={`body-sm py-2 px-3 rounded-[8px] mb-0.5 ${
                      i === 0
                        ? "bg-b-sunken font-medium"
                        : "text-b-text-secondary"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content mock */}
              <div className="flex-1 p-5 md:p-6">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="label-md text-b-text-tertiary tracking-widest">
                      Overall
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {["Overall", "Daily Briefing", "Voice"].map((tab, i) => (
                      <span
                        key={tab}
                        className={`label-sm px-3 py-1 rounded-full ${
                          i === 0
                            ? "bg-b-ink text-b-text-inverse"
                            : "text-b-text-tertiary"
                        }`}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <h3 className="display-s mt-2 mb-1">Good morning, Boss</h3>
                <p className="body-sm text-b-text-tertiary mb-6">
                  Here&apos;s your command center overview.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Drafts ready", value: "3" },
                    { label: "Held for you", value: "2" },
                    { label: "Awaiting a read", value: "7" },
                    { label: "Focus time", value: "4h 20m" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="p-3 rounded-[10px] bg-b-sunken"
                    >
                      <p className="body-xs text-b-text-tertiary">
                        {card.label}
                      </p>
                      <p className="h-3 mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-b-border-subtle" />
                <p className="body-xs text-b-text-tertiary mt-3">
                  Your schedule, tasks, and inbox at a glance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Philosophy ──── */}
      <section className="px-6 py-20 md:py-28 bg-b-sunken">
        <div className="max-w-4xl mx-auto text-center">
          <h2>
            <span className="display-s md:display-l block">
              Software has grown{" "}
              <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                loud.
              </span>
            </span>
            <span className="display-s md:display-l block">
              We designed a quieter kind of help.
            </span>
          </h2>
          <p className="body-lg text-b-text-secondary mt-8 max-w-2xl mx-auto leading-relaxed">
            Every tool tries to be a giant for attention. Butler compresses all
            of those interfaces into one, then fades. Its decisions — with your
            calendars, your voice, your content — what actually delivers your
            day. The rest, it handles.
          </p>
        </div>
      </section>

      {/* ──── Four Features ──── */}
      <section id="features" className="px-6 py-20 md:py-28 max-w-5xl mx-auto">
        <p className="label-md text-b-text-tertiary text-center mb-4 tracking-widest">
          What Butler Does
        </p>
        <h2 className="display-s md:display-m text-center">
          Four services. One steady hand.
        </h2>
        <p className="body-lg text-b-text-secondary text-center mt-4 max-w-2xl mx-auto">
          Butler works with equal fluency across your inbox, calendar, docs,
          code, and conversations. Delegate a task in any modality — chat, a
          note, or a suggestion — pick a means.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mt-14">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-[16px] border border-b-border-subtle bg-b-paper"
            >
              <div className="w-10 h-10 rounded-[10px] bg-b-sunken flex items-center justify-center mb-4">
                <img
                  src="/images/logo-gold-nobg.svg"
                  alt=""
                  className="h-5 w-auto"
                />
              </div>
              <h3 className="h-3 mb-2">{feature.title}</h3>
              <p className="body-md text-b-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Integrations ──── */}
      <section className="px-6 py-20 md:py-28 bg-b-paper">
        <div className="max-w-5xl mx-auto">
          <p className="label-md text-b-text-tertiary text-center mb-4 tracking-widest">
            Subscribe Your Work Life
          </p>
          <h2 className="display-s md:display-m text-center">
            Connect the tools. Butler learns the house.
          </h2>
          <p className="body-lg text-b-text-secondary text-center mt-4 max-w-2xl mx-auto">
            Grant access once. Butler reads, writes, and searches across every
            service — never asking you to open another tab.
          </p>

          <div className="mt-14 max-w-3xl mx-auto">
            {INTEGRATIONS.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                {row.map((name) => (
                  <div
                    key={name}
                    className="p-4 rounded-[12px] border border-b-border-subtle bg-b-raised text-center"
                  >
                    <div className="w-8 h-8 rounded-[8px] bg-b-sunken mx-auto mb-2 flex items-center justify-center">
                      <span className="body-sm-med text-b-text-tertiary">
                        {name.charAt(0)}
                      </span>
                    </div>
                    <p className="body-xs font-medium truncate">{name}</p>
                    <p className="mono-sm text-b-text-tertiary mt-1">
                      Pro Plan
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── Testimonial ──── */}
      <section className="px-6 py-16 md:py-20 bg-b-ink">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="display-s text-b-text-inverse opacity-90"
            style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            &ldquo;...tells me what happened, what I said, what I need to say
            next — and mostly, it just says it for me. My day runs
            itself.&rdquo;
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-b-accent">
              <img
                src="/images/logo-gold-nobg.svg"
                alt=""
                className="h-5 w-auto"
              />
            </div>
            <div className="text-left">
              <p className="body-sm-med text-b-text-inverse">Amara Okafor</p>
              <p className="body-xs text-b-text-inverse opacity-60">
                Founder &amp; CEO, Inka Studio
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Timeline ──── */}
      <section id="timeline" className="px-6 py-20 md:py-28 max-w-4xl mx-auto">
        <p className="label-md text-b-text-tertiary text-center mb-4 tracking-widest">
          A Day With Butler
        </p>
        <h2 className="display-s md:display-m text-center">
          Every hour, a quieter decision.
        </h2>

        <div className="mt-14 md:mt-20 space-y-0">
          {TIMELINE.map((item, i) => (
            <div key={item.time} className="flex gap-6 md:gap-14">
              <div className="w-20 md:w-24 shrink-0 pt-1">
                <p className="mono-md text-b-text-tertiary">{item.time}</p>
              </div>
              <div
                className={`flex-1 pl-6 md:pl-8 border-l border-b-border-subtle ${
                  i < TIMELINE.length - 1 ? "pb-10 md:pb-14" : "pb-0"
                }`}
              >
                <h3 className="h-3 mb-2">{item.title}</h3>
                <p className="body-md text-b-text-secondary">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Final CTA ──── */}
      <section id="cta" className="px-6 py-20 md:py-28 bg-b-ink">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="display-m md:display-l text-b-text-inverse">
            Meet your Butler.
          </h2>
          <p className="body-lg text-b-text-inverse opacity-70 mt-4">
            Private beta, small cohort, hand-connected. Bring your standards —
            Butler will do the rest.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.co"
              className="w-full sm:flex-1 px-4 py-2.5 rounded-[14px] bg-white/10 border border-white/20 text-b-text-inverse placeholder:text-white/40 body-md focus:outline-none focus:border-b-accent"
            />
            <Button variant="accent" size="lg" onClick={onGetStarted}>
              Request Access
            </Button>
          </div>

          <p className="body-xs text-b-text-inverse opacity-40 mt-4">
            We&apos;ll reach out within 48 hours. Limited slots per cohort.
          </p>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer className="px-6 py-10 md:py-12 bg-b-ink border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo-white-nobg.svg"
                alt="Butler"
                className="h-7 w-auto"
              />
              <div>
                <p className="body-sm-med text-b-text-inverse">Butler</p>
                <p className="body-xs text-b-text-inverse opacity-50">
                  quietly orchestrating your day
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {["Trust", "Privacy", "Founders", "Support"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="body-sm text-b-text-inverse opacity-60 hover:opacity-100 transition-opacity"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="body-xs text-b-text-inverse opacity-40">
              &copy; {new Date().getFullYear()} Butler. All rights reserved.
            </p>
            <p className="body-xs text-b-text-inverse opacity-60">
              Built by{" "}
              <a
                href="https://github.com/Anasabubakar"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-100 transition-opacity"
              >
                Anas Abubakar
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
