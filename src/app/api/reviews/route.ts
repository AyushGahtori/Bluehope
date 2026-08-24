import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import { createDemoReview, isDemoRequest } from "@/server/demo-marketplace-store";
import {
  FirestoreUnavailableError,
  listReviewsForProvider,
} from "@/server/firestore/repositories";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

/**
 * GET: reviews for the authenticated provider/institute's own listing,
 * scoped by listingId resolved from the caller's verified UID server-side.
 */
export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const reviews = await listReviewsForProvider(auth.firebaseUid!);
    return Response.json({ status: "ok", reviews });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return persistencePending("reviews");
    throw error;
  }
}

const demoReviewSchema = z.object({
  listingSlug: z.string().min(1),
  authorName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(3000),
  images: z.array(z.string()).max(6).default([]),
});

export async function POST(request: NextRequest) {
  if (isDemoRequest(request)) {
    const parsed = demoReviewSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const review = createDemoReview(parsed.data);
      return Response.json({ status: "created", review }, { status: 201 });
    } catch {
      return Response.json({ status: "not_found", resource: "listing" }, { status: 404 });
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("review");
}
