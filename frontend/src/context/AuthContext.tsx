"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  googleSignIn,
  initAuth,
  logout,
  reconnectGoogleWorkspace,
  hasGoogleWorkspace,
  getAccessToken,
} from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  /** Firebase ID token — used for Butler API Authorization. */
  accessToken: string | null;
  /** Whether a Google OAuth access token is available for Workspace APIs. */
  hasWorkspace: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  reconnectWorkspace: () => Promise<boolean>;
  getGoogleAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = initAuth(
      (firebaseUser, idToken) => {
        setUser(firebaseUser);
        setAccessToken(idToken);
        setHasWorkspace(hasGoogleWorkspace());
        setLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setHasWorkspace(false);
        setLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setHasWorkspace(false);
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);
