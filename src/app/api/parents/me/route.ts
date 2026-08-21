import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  FirestoreUnavailableError,
  getCustomerProfile,
  upsertCustomerProfile,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const profile = await getCustomerProfile(auth.firebaseUid!);
    return Response.json({ status: "ok", profile });
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
    const profile = await upsertCustomerProfile(auth.firebaseUid!, body);
    return Response.json({ status: "ok", profile });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    if (error instanceof ZodError) {
      return Response.json({ status: "invalid_body", issues: error.flatten() }, { status: 400 });
    }
    throw error;
  }
}
