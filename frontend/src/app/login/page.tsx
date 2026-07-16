"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthScreen from "@/components/AuthScreen";
import { formatGoogleAuthError } from "@/lib/firebase";

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return null;

  const handleSignIn = async () => {
    try {
      setError(undefined);
      setIsSigningIn(true);
      await signIn();
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(formatGoogleAuthError(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthScreen
      onSignIn={handleSignIn}
      error={error}
      isSigningIn={isSigningIn}
    />
  );
}
