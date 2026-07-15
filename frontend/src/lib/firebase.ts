import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const GOOGLE_TOKEN_KEY = "butler_google_access_token";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) return null;
  if (app) return app;
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return app;
}

function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  authInstance = getAuth(firebaseApp);
  return authInstance;
}

export const auth = (typeof window !== "undefined" ? getFirebaseAuth() : null) as Auth;

function buildProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/drive");
  provider.addScope("https://www.googleapis.com/auth/calendar");
  provider.addScope("https://www.googleapis.com/auth/gmail.modify");
  provider.addScope("https://www.googleapis.com/auth/tasks");
  provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function persistGoogleToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
  }
}

function readPersistedGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(GOOGLE_TOKEN_KEY);
}

/** Google OAuth access token for Workspace APIs (Calendar, Gmail, Tasks, Drive). */
export function getAccessToken(): string | null {
  return readPersistedGoogleToken();
}

export function hasGoogleWorkspace(): boolean {
  return Boolean(getAccessToken());
}

export async function googleSignIn(): Promise<{
  user: User;
  accessToken: string;
}> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new Error("Firebase not initialized");
  const result = await signInWithPopup(firebaseAuth, buildProvider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || "";
  persistGoogleToken(accessToken || null);
  return { user: result.user, accessToken };
}

/** Re-prompt for Google Workspace scopes when the OAuth token is missing/expired. */
export async function reconnectGoogleWorkspace(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (!firebaseAuth || !user) return null;
  const result = await reauthenticateWithPopup(user, buildProvider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken || null;
  persistGoogleToken(accessToken);
  return accessToken;
}

export function initAuth(
  onUser: (user: User, idToken: string) => void,
  onNoUser: () => void,
  onAuthFailure: () => void
) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    onNoUser();
    return;
  }

  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      onNoUser();
      return;
    }
