import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import {
  listDemoSavedProviders,
  requestOwner,
  setDemoSavedProvider,
} from "@/server/demo-marketplace-store";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

const savedSchema = z.object({
  listingSlug: z.string().min(1),
  listingName: z.string().max(160).optional(),
  saved: z.boolean(),
});

export async function GET(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    return Response.json({ status: "ok", savedProviders: listDemoSavedProviders(owner) });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("saved_providers");
}

export async function POST(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    const parsed = savedSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const result = setDemoSavedProvider(owner, parsed.data.listingSlug, parsed.data.saved);
      return Response.json({ status: "updated", ...result });
    } catch {
      return Response.json({ status: "not_found", resource: "listing" }, { status: 404 });
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("saved_provider");
}