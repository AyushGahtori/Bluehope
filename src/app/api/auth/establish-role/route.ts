import type { NextRequest } from "next/server";
import { FirestoreUnavailableError, establishUserRole } from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

/**
 * Establishes (or continues) the caller's application account with exactly one
 * primary role. The Firebase UID from a verified ID token is the identity key;
 * the desired role is only honored when the account does not exist yet or
 * already carries the same role. Conflicts return 409 without side effects.
 */
export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const desiredRole = typeof body.desiredRole === "string" ? body.desiredRole : "";

    const firebaseClaims =
      typeof auth.claims?.firebase === "object" && auth.claims.firebase
        ? (auth.claims.firebase as Record<string, unknown>)
        : {};
    const providerIds =
      typeof firebaseClaims.sign_in_provider === "string"
        ? [firebaseClaims.sign_in_provider]
        : [];

    const result = await establishUserRole(auth.firebaseUid!, desiredRole, {
      email: auth.email ?? null,
      displayName:
        typeof body.displayName === "string"
          ? body.displayName
          : typeof auth.claims?.name === "string"
            ? auth.claims.name
            : null,
      photoURL:
        typeof body.photoURL === "string"
          ? body.photoURL
          : typeof auth.claims?.picture === "string"
            ? auth.claims.picture
            : null,
      providerIds,
    });

    if (result.status === "invalid_role") {
      return Response.json(
        { status: "invalid_role", message: "desiredRole must be one of customer, soleProvider, institution." },
        { status: 400 },
      );
    }

    if (result.status === "conflict") {
      return Response.json(
        { status: "conflict", role: result.role },
        { status: 409 },
      );
    }

    return Response.json({ status: result.status, role: result.role });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}