"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export async function loginAsAdmin(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("尚未設定 Firebase 環境變數，請參考 docs/cloud-setup.md");
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutAdmin() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export { isFirebaseConfigured };
