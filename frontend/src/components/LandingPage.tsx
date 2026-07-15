"use client";

import { motion } from "framer-motion";
import Button from "./Button";
import ButlerLogo from "./ButlerLogo";
import { fadeUp, usePrefersReducedMotion } from "@/lib/motion";

interface LandingPageProps {
  onGetStarted: () => void;
}

const PARTNERS = [
  "Ashby Studio",
  "North & Fern",
  "Meridian Labs",
  "Foundry 27",
  "Cadence",
  "Nightingale Co.",
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
  { label: "Story", href: "#philosophy" },
  { label: "Services", href: "#features" },
  { label: "The Brief", href: "#timeline" },
  { label: "Trust", href: "#testimonial" },
  { label: "Pricing", href: "#cta" },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="min-h-screen bg-b-canvas">
      <nav className="flex items-center justify-between px-8 lg:px-14 py-6 w-full">
        <div className="flex items-center gap-3">
          <ButlerLogo size={36} variant="dark" />
          <span className="h-3">Butler</span>
        </div>

        <div className="hidden lg:flex items-center gap-9">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="body-md-med text-b-text-secondary hover:text-b-text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="body-md-med text-b-text-primary hover:opacity-80 transition-opacity hidden sm:inline"
          >
            Sign In
          </a>
          <Button variant="primary" size="sm" onClick={onGetStarted} className="!rounded-full">
            Request Access
          </Button>
        </div>
      </nav>

      <motion.section
        className="px-8 lg:px-[120px] pt-16 lg:pt-[72px] pb-24 lg:pb-[120px] text-center flex flex-col items-center gap-12"
        initial={reducedMotion ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2.5 pl-3.5 pr-4 py-1.5 rounded-full bg-b-accent-soft"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-b-accent" />
          <span className="label-md text-b-accent-text tracking-[0.08em]">
            A DIGITAL CHIEF OF STAFF
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="max-w-5xl">
          <span className="display-xl block text-b-text-primary">
            Your day, quietly
          </span>
          <span className="display-xl block">
            <em className="display-italic text-b-accent-text not-italic" style={{ fontStyle: "italic" }}>
              orchestrated
            </em>
            .
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="body-lg text-b-text-secondary max-w-[760px] leading-relaxed"
        >
          Butler is one calm interface that reads, writes, and moves across your
          Google Workspace, GitHub, Notion, Slack, Linear, Figma — every tool
          where your work lives. It anticipates conflicts, drafts your replies,
          prepares your files, and hands you a morning brief. Not another
          dashboard. A staff of one, always in earshot.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-3">
          <Button variant="primary" size="lg" onClick={onGetStarted} className="!rounded-full !px-7">
            Begin with Butler →
          </Button>
          <Button variant="secondary" size="lg" className="!rounded-full !px-7 !border-b-border-strong">
            Watch the brief · 2:14
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-col items-center gap-5 pt-4">
          <p className="label-sm text-b-text-tertiary tracking-[0.12em]">
            SERVING QUIET OPERATORS AT
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-2">
            {PARTNERS.map((name) => (
              <span key={name} className="body-md-med text-b-text-tertiary">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.section>

      <section className="px-8 lg:px-[120px] pb-24 lg:pb-[120px] max-w-[1440px] mx-auto w-full">
        <p className="label-sm text-b-accent-text text-center mb-6 tracking-[0.12em]">
          A GLIMPSE
        </p>
        <h2 className="display-s md:display-m text-center max-w-2xl mx-auto">
          The Command Center — your morning at a glance.
        </h2>

        <div className="mt-10 md:mt-14 rounded-[28px] border border-b-border-default bg-b-paper shadow-[0_40px_80px_-20px_rgba(26,15,8,0.15)] overflow-hidden">
          <div className="h-11 bg-b-sunken flex items-center px-4 gap-2 border-b border-b-border-subtle">
            <span className="w-2.5 h-2.5 rounded-full bg-b-danger/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-b-warning/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-b-success/80" />
            <span className="mono-sm text-b-text-tertiary ml-4">
              butler.app · Good morning, Boss
            </span>
          </div>

          <div className="flex min-h-[420px]">
            <div className="w-[220px] border-r border-b-border-subtle p-5 hidden md:block bg-b-sunken">
              <p className="h-3">Butler</p>
              <p className="mono-label text-b-text-tertiary mt-0.5">chief of staff</p>
              <div className="mt-8 space-y-2">
                {[
                  { label: "Command Center", active: true },
                  { label: "The Brief", active: false },
                  { label: "Conversations", active: false },
                  { label: "Delegated Work", active: false },
                  { label: "Notifications", active: false },
                  { label: "Voice Room", active: false },
                  { label: "Notes & Memory", active: false },
                  { label: "Integrations", active: false },
                ].map(({ label, active }) => (
                  <div
                    key={label}
                    className={`body-sm py-1.5 pl-3 border-l-2 ${
                      active
                        ? "border-b-accent text-b-text-primary font-medium"
                        : "border-transparent text-b-text-secondary"
                    }`}
                  >
                    — {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 p-6 md:p-8 bg-b-paper">
              <h3 className="display-s">Good morning, Boss</h3>
              <p className="body-sm text-b-text-tertiary mt-2">
                Tuesday, 13 July · 47°F, London · 6 items need you
              </p>

              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mt-6">
                <div className="rounded-[14px] border border-b-border-subtle bg-b-raised p-5 min-h-[200px]">
                  <p className="mono-label text-b-accent-text">THE BRIEF · 07:04</p>
                  <p className="body-md-med mt-3 text-b-text-primary">
                    Three quiet moves before your first meeting.
                  </p>
                  <ul className="body-sm text-b-text-secondary mt-4 space-y-2 list-none">
                    <li>· Kai&apos;s Slack thread on the Series-B deck is 14h stale — I drafted a reply.</li>
                    <li>· Your 10 AM with Meridian collides with a Linear deploy window — moved to 10:45.</li>
                    <li>· The Notion doc for tomorrow&apos;s board read is 62% ready — I marked what&apos;s missing.</li>
                  </ul>
                  <p className="body-sm-med text-b-accent-text mt-4">
                    Approve all · Review each · Ask Butler
                  </p>
                </div>

                <div className="rounded-[14px] border border-b-border-subtle bg-b-raised p-5">
                  <p className="mono-label text-b-text-tertiary">TODAY&apos;S FOCUS</p>
                  <p className="display-s mt-2">4h 20m</p>
                  <p className="body-sm text-b-text-secondary mt-1">
                    of deep work protected
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Philosophy ──── */}
      <section id="philosophy" className="px-6 py-20 md:py-28 bg-b-sunken">
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
      <section id="testimonial" className="px-6 py-16 md:py-20 bg-b-ink">
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
