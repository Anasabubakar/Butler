"use client";

import ButlerLogo from "./ButlerLogo";
import Button from "./Button";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-b-canvas px-6">
      <ButlerLogo size={72} />
      <h1 className="display-lg mt-6">Butler</h1>
      <p className="body-lg text-b-text-secondary mt-2 text-center max-w-md">
        Your Digital Chief of Staff. Manage calendar, tasks, email, and more
        — all from one place.
      </p>
      <Button
        variant="accent"
        size="lg"
        className="mt-8"
        onClick={onGetStarted}
      >
        Get Started
      </Button>
      <p className="mono-label text-b-text-tertiary mt-4">
        Powered by Gemini AI
      </p>
    </div>
  );
}
