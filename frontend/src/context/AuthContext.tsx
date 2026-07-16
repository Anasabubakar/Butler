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
  formatGoogleAuthError,
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

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await googleSignIn();
      const idToken = await firebaseUser.getIdToken();
      setUser(firebaseUser);
      setAccessToken(idToken);
      setHasWorkspace(hasGoogleWorkspace());
    } catch (error) {
      console.error("Sign-in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setHasWorkspace(false);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  }, []);

  const reconnectWorkspace = useCallback(async () => {
    try {
      const token = await reconnectGoogleWorkspace();
      const ok = Boolean(token);
      setHasWorkspace(ok);
      return ok;
    } catch (error) {
      console.error("Workspace reconnect failed:", error);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        hasWorkspace,
        loading,
        signIn,
        signOut,
        reconnectWorkspace,
        getGoogleAccessToken: getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
