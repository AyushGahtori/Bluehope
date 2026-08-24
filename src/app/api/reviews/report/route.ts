import { z } from "zod";
import { createDemoReviewReport, isDemoRequest } from "@/server/demo-marketplace-store";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";
import type { NextRequest } from "next/server";

const reportSchema = z.object({
  reviewId: z.string().min(1),
  reason: z.enum(["Spam", "Harassment", "False information", "Personal information", "Inappropriate content", "Other"]),
});

export async function POST(request: NextRequest) {
  if (isDemoRequest(request)) {
    const parsed = reportSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
    }

    const report = createDemoReviewReport(parsed.data);
    return Response.json({ status: "created", report }, { status: 201 });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return Response.json(
    {
      status: "persistence_pending",
      message: "Review reports are configured for Firestore moderation records once Firebase Admin is available.",
    },
    { status: 202 },
  );
}
