/**
 * Verifies Firebase configuration end-to-end:
 * 1. Web API key is accepted by Google Identity Toolkit.
 * 2. Admin SDK can authenticate and reach Firestore.
 *
 * Usage: node scripts/verify-firebase.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

// Tee all output to verify-fb.txt so results survive flaky terminal capture.
const logLines = [];
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
console.log = (...args) => {
  const line = args.join(" ");
  logLines.push(line);
  originalLog(line);
};
console.error = (...args) => {
  const line = args.join(" ");
  logLines.push(line);
  originalError(line);
};
process.on("exit", () => {
  try {
    writeFileSync("verify-fb.txt", logLines.join(String.fromCharCode(10)) + String.fromCharCode(10));
  } catch {}
});

// Minimal .env.local loader (no dependency on dotenv).
for (const line of readFileSync(".env.local", "utf8").split(String.fromCharCode(10))) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, "");
}

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!apiKey) {
  console.error("FAIL: NEXT_PUBLIC_FIREBASE_API_KEY missing from .env.local");
  process.exit(1);
}

// --- Test 1: web API key ---
const response = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: "bluehope-config-check" }) },
);
const payload = await response.json().catch(() => ({}));
const message = payload?.error?.message ?? "";
if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
  console.error("FAIL: Web API key rejected by Google. Re-copy it from Firebase Console.");
  process.exit(1);
}
if (response.ok || message.includes("INVALID_ID_TOKEN")) {
  console.log("PASS: Web API key is valid (server responded as expected for a dummy token).");
} else {
  console.log(`WARN: Unexpected Identity Toolkit response: ${response.status} ${message}`);
}

// --- Test 2: Admin SDK ---
const { initializeApp, cert } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");

try {
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, String.fromCharCode(10)),
    }),
    storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET,
  });

  const users = await getAuth(app).listUsers(1);
  console.log(`PASS: Admin SDK authenticated. Auth service reachable (${users.users.length} user(s) sampled).`);

  const firestore = getFirestore(app);
  const writeResult = await firestore.collection("_healthcheck").doc("ping").set({ at: new Date().toISOString() });
  console.log(`PASS: Firestore reachable (write at ${writeResult.writeTime.toDate().toISOString()}).`);
  await firestore.collection("_healthcheck").doc("ping").delete();
  console.log("ALL CHECKS PASSED");
} catch (error) {
  console.error("FAIL: Admin SDK error:", error.message);
  process.exit(1);
}