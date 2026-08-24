/**
 * Deploys composite indexes and TTL field overrides from firestore.indexes.json
 * to Firebase via the Firestore Admin REST API, authenticated with the service
 * account from secrets/. No Firebase CLI or interactive login required.
 *
 * Requires the service account to hold datastore.indexes.create permission
 * (e.g. roles/datastore.indexAdmin or roles/editor).
 *
 * Usage: node scripts/deploy-indexes.mjs
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "bluehope-da5b5";

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
  const signature = signer.sign(
    sa.private_key.split(String.fromCharCode(92) + "n").join(String.fromCharCode(10)),
  ).toString("base64");
  const assertion = `${header}.${claims}.${signature}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Token exchange returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  if (!data.access_token) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${response.status}) from ${url}: ${text.slice(0, 200)}`);
  }
  return { status: response.status, ok: response.ok, body };
}

function fieldSignature(index) {
  return (index.fields ?? [])
    .map((field) => `${field.fieldPath}:${field.order ?? field.arrayConfig}`)
    .join("|");
}

try {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const databaseBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;
  const config = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));

  // --- existing indexes ---
  const listResult = await jsonFetch(`${databaseBase}/collectionGroups/-/indexes`, { headers });
  if (!listResult.ok) throw new Error(`Index list failed: ${JSON.stringify(listResult.body)}`);
  const existing = new Set(
    (listResult.body.indexes ?? []).map((index) => `${index.queryScope}:${fieldSignature(index)}`),
  );

  let created = 0;
  let skipped = 0;
  for (const index of config.indexes ?? []) {
    const signature = `${index.queryScope}:${fieldSignature(index)}`;
    if (existing.has(signature)) {
      skipped += 1;
      continue;
    }
    const createResult = await jsonFetch(
      `${databaseBase}/collectionGroups/${encodeURIComponent(index.collectionGroup)}/indexes`,
      { method: "POST", headers, body: JSON.stringify(index) },
    );
    if (!createResult.ok && createResult.body?.error?.code !== 409) {
      throw new Error(`Index create failed (${index.collectionGroup}): ${JSON.stringify(createResult.body)}`);
    }
    created += 1;
    console.log(`INDEX QUEUED: ${index.collectionGroup} [${fieldSignature(index)}]`);
  }

  // --- TTL field overrides ---
  for (const override of config.fieldOverrides ?? []) {
    const fieldPath = encodeURIComponent(override.fieldPath);
    const url = `${databaseBase}/collectionGroups/${encodeURIComponent(override.collectionGroup)}/fields/${fieldPath}?updateMask=ttlConfig`;
    const patchResult = await jsonFetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(override.ttl ? { ttlConfig: {} } : { ttlConfig: null }),
    });
    if (!patchResult.ok) {
      throw new Error(`TTL override failed (${override.collectionGroup}.${override.fieldPath}): ${JSON.stringify(patchResult.body)}`);
    }
    console.log(`TTL CONFIGURED: ${override.collectionGroup}.${override.fieldPath}`);
  }

  console.log(`INDEX DEPLOYMENT COMPLETE: ${created} created/queued, ${skipped} already present.`);
} catch (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}