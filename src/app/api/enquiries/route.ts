import type { NextRequest } from "next/server";
import { persistencePending } from "@/server/api-responses";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("enquiries");
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("enquiry");
}
