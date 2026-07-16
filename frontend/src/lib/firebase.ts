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

/**
 * Workspace scopes Butler actually uses today.
 * Keep this list tight — extra restricted scopes (full Drive, Contacts, Docs…)
 * make Google return 403 access_denied for unverified / Testing apps.
 *
 * Must also be enabled on the Google Cloud OAuth consent screen for client
 * 553230082923-….apps.googleusercontent.com (Firebase project api-with-ay).
 */
const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/tasks",
];

function buildProvider() {
  const provider = new GoogleAuthProvider();
  for (const scope of GOOGLE_WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }
  // consent forces scope grant; offline is best-effort with popup (Firebase
  // mainly returns short-lived access tokens for Workspace API calls).
  provider.setCustomParameters({ prompt: "consent", access_type: "offline" });
  return provider;
}

/** Human-readable message for Google OAuth / Firebase auth failures. */
export function formatGoogleAuthError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code || "")
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "";

  if (
    code === "auth/access-denied" ||
    /access_denied|403|access denied/i.test(message) ||
    /access_denied/i.test(code)
  ) {
    return [
      "Google blocked this sign-in (403 access_denied).",
      "If the OAuth app is in Testing mode, add this Gmail as a Test user in",
      "Google Cloud → APIs & Services → OAuth consent screen → Test users.",
      "Also confirm butler.pxxl.run is an Authorized domain in Firebase and Google Cloud.",
    ].join(" ");
  }
  if (code === "auth/popup-closed-by-user" || /popup-closed/i.test(code)) {
    return "Sign-in window was closed before finishing.";
  }
  if (code === "auth/popup-blocked") {
    return "Browser blocked the Google popup. Allow popups for this site and try again.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Authentication → Settings → Authorized domains. Add butler.pxxl.run.";
  }
  return message || "Google sign-in failed.";
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
    try {
      const idToken = await user.getIdToken();
      onUser(user, idToken);
    } catch {
      onAuthFailure();
    }
  });
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  const user = firebaseAuth?.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export async function logout() {
  persistGoogleToken(null);
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
}
