import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

export const firebaseClientConfig = {
  apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: clientEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const hasFirebaseClientConfig = Boolean(
  firebaseClientConfig.apiKey &&
    firebaseClientConfig.authDomain &&
    firebaseClientConfig.projectId &&
    firebaseClientConfig.appId,
);

export function getFirebaseClientConfigIssue() {
  const missing = Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: firebaseClientConfig.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseClientConfig.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseClientConfig.projectId,
    NEXT_PUBLIC_FIREBASE_APP_ID: firebaseClientConfig.appId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return `Missing Firebase web config: ${missing.join(", ")}. Add the values to .env.local and restart the dev server.`;
  }

  if (
    firebaseClientConfig.authDomain &&
    firebaseClientConfig.projectId &&
    !firebaseClientConfig.authDomain.startsWith(`${firebaseClientConfig.projectId}.`)
  ) {
    return "Firebase authDomain does not match projectId. Copy the Web App config from the same Firebase project.";
  }

  if (firebaseClientConfig.apiKey && !firebaseClientConfig.apiKey.startsWith("AIza")) {
    return "Firebase API key format is invalid. Copy the browser Web API key from Firebase Project settings.";
  }

  return null;
}
