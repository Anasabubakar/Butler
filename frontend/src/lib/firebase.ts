import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/calendar");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");
provider.addScope("https://www.googleapis.com/auth/tasks");
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

let cachedAccessToken: string | null = null;

export async function googleSignIn(): Promise<{
  user: User;
  accessToken: string;
}> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new Error("Firebase not initialized");
  const result = await signInWithPopup(firebaseAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken || null;
  return { user: result.user, accessToken: cachedAccessToken || "" };
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function initAuth(
  onUser: (user: User, token: string) => void,
  onNoUser: () => void,
  onAuthFailure: () => void
) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    onNoUser();
    return;
  }
  onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      if (cachedAccessToken) {
        onUser(user, cachedAccessToken);
      } else {
        onAuthFailure();
      }
    } else {
      onNoUser();
    }
  });
}

export async function logout() {
  cachedAccessToken = null;
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
}
