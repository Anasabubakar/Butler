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
