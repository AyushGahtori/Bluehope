import type { NextRequest } from "next/server";
import {
  FirestoreUnavailableError,
  type ProviderProfileKind,
  getProviderProfileByOwner,
  upsertProviderProfile,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

/**
 * GET: returns the authenticated provider/institute's own profile, looked up
 * by ownerUid (Firebase UID) — never by email and never across accounts.
 *
 * PUT: upserts profile fields against the authenticated owner's profile
 * document. Ownership always comes from the verified ID token, never from
 * form-entered emails or client-supplied IDs.
 */
export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  const kind = profileKindForRole(auth.role);
  if (!kind) {
    return Response.json(
      { status: "forbidden", message: "This account role cannot own a provider profile." },
      { status: 403 },
    );
  }

  try {
    const profile = await getProviderProfileByOwner(auth.firebaseUid!, kind);
    return Response.json({ status: "ok", profile });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  const kind = profileKindForRole(auth.role);
  if (!kind) {
    return Response.json(
      { status: "forbidden", message: "This account role cannot own a provider profile." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = sanitizeProfilePatch(body);

  try {
    const profile = await upsertProviderProfile(auth.firebaseUid!, kind, patch);
    return Response.json({ status: "ok", profile });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}

function profileKindForRole(role?: string): ProviderProfileKind | null {
  if (role === "institution") return "institution";
  if (role === "soleProvider") return "soleProvider";
  return null;
}

const STRING_LISTS = new Set(["services", "conditions", "images"]);

/** Whitelist of editable fields; everything else is ignored server-side. */
function sanitizeProfilePatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name.slice(0, 160);
  if (typeof body.tagline === "string") patch.tagline = body.tagline.slice(0, 200);
  if (typeof body.bio === "string") patch.bio = body.bio.slice(0, 1200);

  for (const key of STRING_LISTS) {
    const value = body[key];
    if (Array.isArray(value)) {
      patch[key] = value.filter((item): item is string => typeof item === "string").slice(0, 24);
    }
  }

  if (body.weeklyHours && typeof body.weeklyHours === "object") {
    patch.weeklyHours = body.weeklyHours;
  }

  if (body.location && typeof body.location === "object") {
    const location = body.location as Record<string, unknown>;
    patch.location = {
      text: typeof location.text === "string" ? location.text.slice(0, 300) : "",
      source: location.source === "browser_geolocation" ? "browser_geolocation" : "manual",
      capturedAt: typeof location.capturedAt === "string" ? location.capturedAt : null,
      latitude: typeof location.latitude === "number" ? location.latitude : null,
      longitude: typeof location.longitude === "number" ? location.longitude : null,
    };
  }

  for (const key of ["pricing", "contact", "details"] as const) {
    const value = body[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const clean: Record<string, string> = {};
      for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
        if (typeof raw === "string") clean[field] = raw.slice(0, 300);
      }
      patch[key] = clean;
    }
  }

  return patch;
}