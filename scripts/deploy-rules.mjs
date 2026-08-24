/**
 * Deploys firestore.rules and storage.rules to Firebase via the Rules API,
 * authenticated with the service account from secrets/. No Firebase CLI or
 * interactive login required.
 *
 * Usage: node scripts/deploy-rules.mjs
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "bluehope-da5b5";
const BUCKET = process.env.FIREBASE_ADMIN_STORAGE_BUCKET ?? "bluehope-da5b5.firebasestorage.app";

// --- load .env.local ---
for (const line of readFileSync(".env.local", "utf8").split(String.fromCharCode(10))) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, "");
}

const sa = JSON.parse(
  readFileSync("secrets/bluehope-da5b5-firebase-adminsdk-fbsvc-174c4e0a30.json", "utf8"),
);

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key.replace(/\\n/g, String.fromCharCode(10))).toString("base64");
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function deployRuleset(token, serviceName, content) {
  // 1. Create the ruleset.
  const createResponse = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: { files: [{ name: `${serviceName}.rules`, content }] } }),
  });
  const created = await createResponse.json();
  if (!created.name) throw new Error(`Ruleset creation failed (${serviceName}): ${JSON.stringify(created)}`);

  // 2. Release it. Releases may not exist yet on a fresh project, so try
  // PATCH first, then fall back to create (deleting any stale release).
  const releaseName =
    serviceName === "cloud.firestore"
      ? `projects/${PROJECT_ID}/releases/cloud.firestore`
      : `projects/${PROJECT_ID}/releases/firebase.storage`;

  const patchResponse = await fetch(
    `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: releaseName, rulesetName: created.name }),
    },
  );
  if (patchResponse.ok) {
    console.log(`DEPLOYED: ${serviceName} rules -> ${releaseName}`);
    return;
  }

  // Release does not exist yet (or is stale): recreate it.
  await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});

  const createReleaseResponse = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: releaseName.split("/releases/")[1], rulesetName: created.name }),
    },
  );
  const createdRelease = await createReleaseResponse.json();
  if (!createdRelease.name && createdRelease?.error?.code !== 409) {
    throw new Error(`Release failed (${serviceName}): ${JSON.stringify(createdRelease)}`);
  }
  console.log(`DEPLOYED: ${serviceName} rules -> ${createdRelease.name ?? releaseName}`);
}

try {
  const token = await getAccessToken();
  await deployRuleset(token, "cloud.firestore", readFileSync("firestore.rules", "utf8"));
  await deployRuleset(token, "firebase.storage", readFileSync("storage.rules", "utf8"));
  console.log("RULES DEPLOYMENT COMPLETE");
} catch (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}