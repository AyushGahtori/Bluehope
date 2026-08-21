import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { notFound } from "@/server/api-responses";
import {
  FirestoreUnavailableError,
  getChildProfile,
  softDeleteChildProfile,
  updateChildProfile,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const { id } = await context.params;
    const child = await getChildProfile(auth.firebaseUid!, id);
    if (!child) return notFound("child");
    return Response.json({ status: "ok", child });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const child = await updateChildProfile(auth.firebaseUid!, id, body);
    if (!child) return notFound("child");
    return Response.json({ status: "ok", child });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    if (error instanceof ZodError) {
      return Response.json({ status: "invalid_body", issues: error.flatten() }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const { id } = await context.params;
    const deleted = await softDeleteChildProfile(auth.firebaseUid!, id);
    if (!deleted) return notFound("child");
    return Response.json({ status: "deleted" });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return protectedPendingResponse(auth);
    throw error;
  }
}
