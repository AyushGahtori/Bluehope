import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n");
}

function adminStorageBucket() {
  const configured =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

  if (!configured) return projectId ? `${projectId}.appspot.com` : undefined;
  if (configured.endsWith(".firebasestorage.app") && projectId) {
    return `${projectId}.appspot.com`;
  }

  return configured;
}

export function hasFirebaseAdminConfig() {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

export function getFirebaseAdminApp(): App | null {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
    storageBucket: adminStorageBucket(),
  });
}

export function getAdminAuth() {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminStorage() {
  const app = getFirebaseAdminApp();
  return app ? getStorage(app) : null;
}
