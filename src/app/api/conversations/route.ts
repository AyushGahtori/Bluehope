import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import {
  getOrCreateDemoConversation,
  listDemoConversations,
} from "@/server/demo-conversation-store";
import { listDemoEnquiries } from "@/server/demo-marketplace-store";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

const createSchema = z.object({
  enquiryId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    return Response.json({ status: "ok", conversations: listDemoConversations(owner) });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("conversations");
}

export async function POST(request: NextRequest) {
  const owner = requestOwner(request);
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (owner !== "anonymous") {
    const enquiry = listDemoEnquiries(owner).find((item) => item.id === parsed.data.enquiryId);
    if (!enquiry) {
      return Response.json({ status: "not_found", resource: "enquiry" }, { status: 404 });
    }
    const conversation = getOrCreateDemoConversation(owner, {
      id: enquiry.id,
      parentName: enquiry.parentName,
      serviceId: enquiry.serviceId,
      message: enquiry.message,
      createdAt: enquiry.createdAt,
    });
    return Response.json({ status: "ok", conversation });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("conversation");
}

function requestOwner(request: NextRequest): string {
  const header = request.headers.get("x-bluehope-demo");
  return header && header !== "anonymous" ? header : "anonymous";
}