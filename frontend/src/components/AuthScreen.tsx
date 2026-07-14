"use client";

import ButlerLogo from "./ButlerLogo";
import Button from "./Button";

interface AuthScreenProps {
  onSignIn: () => void;
  error?: string;
}

export default function AuthScreen({ onSignIn, error }: AuthScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-b-canvas px-6">
      <ButlerLogo size={56} />
      <h2 className="heading-lg mt-6">Sign in to Butler</h2>
      <p className="body-md text-b-text-secondary mt-2 text-center max-w-sm">
        Connect your Google account to access Calendar, Tasks, Gmail, Drive,
        and Contacts.
      </p>
      {error && (
        <div className="mt-4 px-4 py-2 rounded-[10px] bg-b-danger-soft text-b-danger text-sm">
          {error}
        </div>
      )}
      <Button
        variant="accent"
        size="lg"
        className="mt-6"
        onClick={onSignIn}
      >
        Sign in with Google
      </Button>
      <p className="caption text-b-text-tertiary mt-6 max-w-xs text-center">
        Butler requests access to your workspace for productivity features.
        Your data stays private.
      </p>
    </div>
  );
}
