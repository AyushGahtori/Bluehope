import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  createChildProfile,
  FirestoreUnavailableError,
  listChildProfiles,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const children = await listChildProfiles(auth.firebaseUid!);
    return Response.json({ status: "ok", children });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const body = await request.json().catch(() => ({}));
    const child = await createChildProfile(auth.firebaseUid!, body);
    return Response.json({ status: "created", child }, { status: 201 });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    if (error instanceof ZodError) {
      return Response.json({ status: "invalid_body", issues: error.flatten() }, { status: 400 });
    }
    throw error;
  }
}
