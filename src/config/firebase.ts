"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  firebaseClientConfig,
  getFirebaseClientConfigIssue,
  hasFirebaseClientConfig,
} from "@/config/env";

export async function getFirebaseWebKeyIssue() {
  const configIssue = getFirebaseClientConfigIssue();
  if (configIssue) return configIssue;

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseClientConfig.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "bluehope-config-check" }),
      },
    );

    if (response.ok) return null;

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const message = payload?.error?.message ?? "";

    if (
      message.includes("API key not valid") ||
      message.includes("API_KEY_INVALID")
    ) {
      return "Firebase is rejecting the current Web API key. Replace NEXT_PUBLIC_FIREBASE_API_KEY with the active browser key from Firebase Project settings, then restart the dev server.";
    }

    if (message.includes("INVALID_ID_TOKEN")) return null;

    return null;
  } catch {
    return null;
  }
}

export function getFirebaseApp() {
  const configIssue = getFirebaseClientConfigIssue();
  if (configIssue) {
    throw new Error(configIssue);
  }

  if (!hasFirebaseClientConfig) {
    return null;
  }

  return getApps()[0] ?? initializeApp(firebaseClientConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseFirestore() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export const googleProvider = new GoogleAuthProvider();
