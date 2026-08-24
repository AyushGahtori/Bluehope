import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import {
  appendDemoText,
  listDemoConversations,
  requestDemoAppointment,
  setDemoAppointmentStatus,
} from "@/server/demo-conversation-store";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().min(1).max(2000),
  }),
  z.object({
    kind: z.literal("appointment"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    kind: z.literal("appointment_action"),
    appointmentId: z.string().min(1),
    action: z.enum(["confirm", "decline", "cancel"]),
  }),
]);

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const owner = requestOwner(request);

  if (owner !== "anonymous") {
    const conversation = listDemoConversations(owner).find((item) => item.id === id);
    if (!conversation) {
      return Response.json({ status: "not_found", resource: "conversation" }, { status: 404 });
    }
    return Response.json({ status: "ok", messages: conversation.messages });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("messages");
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const owner = requestOwner(request);
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (owner !== "anonymous") {
    const body = parsed.data;

    if (body.kind === "text") {
      const message = appendDemoText(owner, id, "provider", body.text);
      if (!message) {
        return Response.json({ status: "not_found", resource: "conversation" }, { status: 404 });
      }
      return Response.json({ status: "created", message }, { status: 201 });
    }

    if (body.kind === "appointment") {
      const result = requestDemoAppointment(owner, id, { date: body.date, time: body.time });
      if (!result) {
        return Response.json({ status: "not_found", resource: "conversation" }, { status: 404 });
      }
      return Response.json({ status: "created", ...result }, { status: 201 });
    }

    const appointment = setDemoAppointmentStatus(
      owner,
      id,
      body.appointmentId,
      body.action === "confirm" ? "confirmed" : body.action === "decline" ? "declined" : "cancelled",
    );
    if (!appointment) {
      return Response.json({ status: "not_found", resource: "appointment" }, { status: 404 });
    }
    return Response.json({ status: "updated", appointment });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("message");
}

function requestOwner(request: NextRequest): string {
  const header = request.headers.get("x-bluehope-demo");
  return header && header !== "anonymous" ? header : "anonymous";
}