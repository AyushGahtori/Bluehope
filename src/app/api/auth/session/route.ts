import type { NextRequest } from "next/server";
import {
  FirestoreUnavailableError,
  getUserByUid,
} from "@/server/firestore/repositories";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

/**
 * Returns the authenticated account's authoritative application role, read
 * directly from users/{firebaseUid}. Used by client route guards so dashboard
 * access never depends on URL segments or client-claimed roles alone.
 */
export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const user = await getUserByUid(auth.firebaseUid!);
    return Response.json({
      status: "ok",
      uid: auth.firebaseUid,
      email: auth.email ?? user?.email ?? null,
      displayName: user?.displayName ?? null,
      role: user?.role ?? null,
      onboardingCompleted: user?.onboardingCompleted ?? false,
    });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError)
      return protectedPendingResponse(auth);
    throw error;
  }
}
