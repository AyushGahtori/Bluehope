import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import { isDemoRequest, setDemoReviewReply } from "@/server/demo-marketplace-store";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

const demoReplySchema = z.object({
  reviewId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  if (isDemoRequest(request)) {
    const parsed = demoReplySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const reply = setDemoReviewReply(parsed.data.reviewId, parsed.data.text.trim());
      return Response.json({ status: "created", reply }, { status: 201 });
    } catch {
      return Response.json({ status: "not_found", resource: "review" }, { status: 404 });
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("review reply");
}