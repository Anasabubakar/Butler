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
import { googleSignIn, initAuth, logout } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth(
      (firebaseUser, token) => {
        setUser(firebaseUser);
        setAccessToken(token);
        setLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
      }
    );
  }, []);

  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const { user: firebaseUser, accessToken: token } = await googleSignIn();
      setUser(firebaseUser);
      setAccessToken(token);
    } catch (error) {
      console.error("Sign-in failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  }, []);

  return (
    <AuthContext value={{ user, accessToken, loading, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
