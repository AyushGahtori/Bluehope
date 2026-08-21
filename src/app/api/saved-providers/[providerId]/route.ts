import type { NextRequest } from "next/server";
import { persistencePending } from "@/server/api-responses";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

export async function DELETE(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("saved_provider_delete");
}
