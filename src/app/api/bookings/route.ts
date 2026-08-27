import type { NextRequest } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/models/firestore";
import { generateSlotsForDate } from "@/data/marketplace";
import {
  createDemoBooking,
  getDemoAvailability,
  listDemoBookings,
  requestOwner,
} from "@/server/demo-marketplace-store";
import {
  FirestoreUnavailableError,
  getListingDocBySlug,
  listBookingsForCustomer,
  listBookingsForProvider,
} from "@/server/firestore/repositories";
import { getAdminFirestore } from "@/server/firebase/admin";
import { resolveAuthContext } from "@/server/middleware/auth";

const bookingSchema = z.object({
  listingSlug: z.string().min(1),
  parentName: z.string().min(1).max(120),
  childName: z.string().min(1).max(120),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const url = new URL(request.url);
  const listingSlug = url.searchParams.get("listingSlug");
  const date = url.searchParams.get("date");

  if (listingSlug && date) {
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        const listing = await getListingDocBySlug(listingSlug);
        if (listing) {
          const snapshot = await firestore
            .collection(COLLECTIONS.bookings)
            .where("listingSlug", "==", listingSlug)
            .where("date", "==", date)
            .where("status", "==", "confirmed")
            .get();

          const bookedSlots = snapshot.docs.map((doc) => doc.data().slotId as string);
          const slots = generateSlotsForDate(date, bookedSlots);
          return Response.json({
            status: "ok",
            availability: {
              listingSlug,
              date,
              capacity: 8,
              confirmedCount: bookedSlots.length,
              remainingCapacity: Math.max(0, 8 - bookedSlots.length),
              fullyBooked: bookedSlots.length >= 8,
              slots,
            },
          });
        }
      } catch (err) {
        if (!(err instanceof FirestoreUnavailableError)) {
          console.error("Error fetching booking availability from Firestore:", err);
        }
      }
    }

    try {
      return Response.json({ status: "ok", availability: getDemoAvailability(listingSlug, date) });
    } catch {
      return Response.json({ status: "not_found", resource: "listing" }, { status: 404 });
    }
  }

  if (auth.authenticated && auth.firebaseUid) {
    try {
      if (auth.role === "institution" || auth.role === "soleProvider") {
        const bookings = await listBookingsForProvider(auth.firebaseUid);
        return Response.json({ status: "ok", bookings });
      }
      const bookings = await listBookingsForCustomer(auth.firebaseUid);
      return Response.json({ status: "ok", bookings });
    } catch (error) {
      if (error instanceof FirestoreUnavailableError) {
        return Response.json({ status: "ok", bookings: listDemoBookings(`user:${auth.firebaseUid}`) });
      }
      throw error;
    }
  }

  if (owner !== "anonymous") {
    if (owner.startsWith("user:")) {
      const uid = owner.slice(5);
      try {
        const providerBookings = await listBookingsForProvider(uid);
        if (providerBookings.length > 0) {
          return Response.json({ status: "ok", bookings: providerBookings });
        }
        const customerBookings = await listBookingsForCustomer(uid);
        if (customerBookings.length > 0) {
          return Response.json({ status: "ok", bookings: customerBookings });
        }
      } catch {
        // Fallback to demo store
      }
    }
    return Response.json({ status: "ok", bookings: listDemoBookings(owner) });
  }

  return Response.json({ status: "ok", bookings: [] });
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const parsed = bookingSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ status: "invalid_body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const customerUid = auth.firebaseUid || (owner.startsWith("user:") ? owner.slice(5) : "anonymous");
  const firestore = getAdminFirestore();

  if (firestore) {
    try {
      const listing = await getListingDocBySlug(parsed.data.listingSlug);
      if (listing) {
        const slots = generateSlotsForDate(parsed.data.date, []);
        const selectedSlot = slots.find((s) => s.id === parsed.data.slotId);

        const bookingRef = firestore.collection(COLLECTIONS.bookings).doc();
        const now = FieldValue.serverTimestamp();
        const booking = {
          id: bookingRef.id,
          customerUid,
          providerUid: listing.ownerUid,
          listingId: listing.id,
          listingSlug: parsed.data.listingSlug,
          listingName: listing.name,
          parentName: parsed.data.parentName,
          childName: parsed.data.childName,
          serviceId: parsed.data.serviceId,
          date: parsed.data.date,
          slotId: parsed.data.slotId,
          start: selectedSlot?.start || "10:00 AM",
          end: selectedSlot?.end || "11:00 AM",
          status: "confirmed",
          createdAt: now,
        };
        await bookingRef.set(booking);

        return Response.json(
          {
            status: "confirmed",
            booking: {
              ...booking,
              createdAt: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }
    } catch (err) {
      if (!(err instanceof FirestoreUnavailableError)) {
        console.error("Error creating booking in Firestore:", err);
      }
    }
  }

  // Fallback to demo booking
  try {
    const booking = createDemoBooking(
      parsed.data,
      customerUid !== "anonymous" ? `user:${customerUid}` : owner,
    );
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