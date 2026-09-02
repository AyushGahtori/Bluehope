/**
 * One-time helper: generates .env.local from the service account JSON in
 * secrets/ plus the Firebase web config below. Keeps the private key out of
 * shell history and chat logs.
 *
 * Usage: node scripts/setup-env.mjs [path-to-service-account.json]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const serviceAccountPath =
  process.argv[2] ?? "secrets/bluehope-da5b5-firebase-adminsdk-fbsvc-174c4e0a30.json";

const webConfig = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyDh175pvS4gfy4M-J-tOzJe_kutrQcVMzk",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "bluehope-da5b5.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "bluehope-da5b5",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "bluehope-da5b5.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "949354404",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:949354404:web:a7085eefbf33b33ca94b31",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-YQWD7JWMSH",
};

if (!existsSync(serviceAccountPath)) {
  console.error(`Service account file not found: ${serviceAccountPath}`);
  process.exit(1);
}

const sa = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

// Built via char codes so this file contains no raw control characters.
const LF = String.fromCharCode(10);
const BACKSLASH_N = String.fromCharCode(92) + "n";

const lines = [
  ...Object.entries(webConfig).map(([key, value]) => `${key}=${value}`),
  "",
  `FIREBASE_ADMIN_PROJECT_ID=${sa.project_id}`,
  `FIREBASE_ADMIN_CLIENT_EMAIL=${sa.client_email}`,
  `FIREBASE_ADMIN_PRIVATE_KEY="${sa.private_key.split(LF).join(BACKSLASH_N)}"`,
  `FIREBASE_ADMIN_STORAGE_BUCKET=${sa.project_id}.appspot.com`,
  "",
];

writeFileSync(".env.local", lines.join(LF));
console.log(`.env.local written (${lines.length} lines) from ${serviceAccountPath}`);
