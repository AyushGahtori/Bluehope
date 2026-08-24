import type { NextRequest } from "next/server";
import { z } from "zod";
import { persistencePending } from "@/server/api-responses";
import {
  createDemoBooking,
  getDemoAvailability,
  listDemoBookings,
  requestOwner,
} from "@/server/demo-marketplace-store";
import { protectedPendingResponse, resolveAuthContext } from "@/server/middleware/auth";

const bookingSchema = z.object({
  listingSlug: z.string().min(1),
  parentName: z.string().min(1).max(120),
  childName: z.string().min(1).max(120),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    const url = new URL(request.url);
    const listingSlug = url.searchParams.get("listingSlug");
    const date = url.searchParams.get("date");

    if (listingSlug && date) {
      try {
        return Response.json({ status: "ok", availability: getDemoAvailability(listingSlug, date) });
      } catch {
        return Response.json({ status: "not_found", resource: "listing" }, { status: 404 });
      }
    }

    return Response.json({ status: "ok", bookings: listDemoBookings(owner) });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("bookings");
}

export async function POST(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    const parsed = bookingSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const booking = createDemoBooking(parsed.data, owner);
      return Response.json({ status: "confirmed", booking }, { status: 201 });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "booking_failed";
      return Response.json(
        {
          status: reason === "slot_unavailable" ? "slot_unavailable" : "not_found",
          message:
            reason === "slot_unavailable"
              ? "That appointment slot is no longer available. Please choose another time."
              : "We could not find that provider or institute.",
        },
        { status: reason === "slot_unavailable" ? 409 : 404 },
      );
    }
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);
  return persistencePending("booking");
}