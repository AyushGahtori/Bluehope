import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import {
  getDemoAvailability,
  isDemoRequest,
  setDemoAvailabilityOverride,
} from "@/server/demo-marketplace-store";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const demoAvailabilityQuerySchema = z.object({
  listingSlug: z.string().min(1),
  date: z.string().regex(datePattern),
});

const demoAvailabilityUpdateSchema = z.object({
  listingSlug: z.string().min(1),
  date: z.string().regex(datePattern),
  capacity: z.number().int().min(1).max(24).optional(),
  blockedSlots: z.array(z.string().min(1)).max(48).optional(),
});

export async function GET(request: NextRequest) {
  if (isDemoRequest(request)) {
    const url = new URL(request.url);
    const parsed = demoAvailabilityQuerySchema.safeParse({
      listingSlug: url.searchParams.get("listingSlug") ?? "",
      date: url.searchParams.get("date") ?? "",
    });
    if (!parsed.success) {
      return Response.json(
        { status: "invalid_query", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      return Response.json({
        status: "ok",
        availability: getDemoAvailability(
          parsed.data.listingSlug,
          parsed.data.date,
        ),
      });
    } catch {
      return Response.json(
        { status: "not_found", resource: "listing" },
        { status: 404 },
      );
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("availability");
}

export async function PUT(request: NextRequest) {
  if (isDemoRequest(request)) {
    const parsed = demoAvailabilityUpdateSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return Response.json(
        { status: "invalid_body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const availability = setDemoAvailabilityOverride(
        parsed.data.listingSlug,
        parsed.data.date,
        {
          ...(parsed.data.capacity !== undefined
            ? { capacity: parsed.data.capacity }
            : {}),
          ...(parsed.data.blockedSlots !== undefined
            ? { blockedSlots: parsed.data.blockedSlots }
            : {}),
        },
      );
      return Response.json({ status: "updated", availability });
    } catch {
      return Response.json(
        { status: "not_found", resource: "listing" },
        { status: 404 },
      );
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("availability override");
}
