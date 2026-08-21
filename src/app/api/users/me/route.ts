import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { FirestoreUnavailableError, getUserByUid, upsertUserFromAuth } from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const user = await getUserByUid(auth.firebaseUid!);
    return Response.json({ status: "ok", user });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const body = await request.json().catch(() => ({}));
    const firebaseClaims =
      typeof auth.claims?.firebase === "object" && auth.claims.firebase
        ? (auth.claims.firebase as Record<string, unknown>)
        : {};
    const providerIds =
      typeof firebaseClaims.sign_in_provider === "string"
        ? [firebaseClaims.sign_in_provider]
        : [];

    const user = await upsertUserFromAuth(
      auth.firebaseUid!,
      {
        email: auth.email,
        providerIds,
        displayName: typeof auth.claims?.name === "string" ? auth.claims.name : null,
        photoURL: typeof auth.claims?.picture === "string" ? auth.claims.picture : null,
      },
      body,
    );

    return Response.json({ status: "ok", user });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    if (error instanceof ZodError) {
      return Response.json({ status: "invalid_body", issues: error.flatten() }, { status: 400 });
    }
    throw error;
  }
}
