import "server-only";

import { demoProviders } from "@/data/demo";
import {
  defaultWeeklySchedule,
  demoReviews,
  generateSlotsForDate,
  reviewsForProfile,
  type Review,
} from "@/data/marketplace";

type DemoEnquiry = {
  id: string;
  owner: string;
  listingSlug: string;
  listingName: string;
  parentName: string;
  phone: string;
  serviceId: string;
  childName?: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
};

type DemoBooking = {
  id: string;
  owner: string;
  listingSlug: string;
  listingName: string;
  parentName: string;
  childName: string;
  serviceId: string;
  date: string;
  slotId: string;
  start: string;
  end: string;
  status: "confirmed" | "requested" | "cancelled" | "completed" | "no_show";
  createdAt: string;
};

type DemoSavedProvider = {
  id: string;
  owner: string;
  listingSlug: string;
  listingName: string;
  createdAt: string;
};

type DemoReport = {
  id: string;
  reviewId: string;
  reason: string;
  createdAt: string;
};

export type EnquiryStatus = "new" | "responded" | "in_progress" | "closed";

export type AvailabilityOverride = {
  capacity?: number;
  blockedSlots?: string[];
};

export type ProviderReply = {
  authorName: string;
  text: string;
  date: string;
};

const globalStore = globalThis as typeof globalThis & {
  bluehopeDemoStore?: {
    enquiries: DemoEnquiry[];
    bookings: DemoBooking[];
    savedProviders: DemoSavedProvider[];
    reviews: Review[];
    reports: DemoReport[];
    reviewReplies: Record<string, ProviderReply>;
    availabilityOverrides: Record<string, Record<string, AvailabilityOverride>>;
  };
};

const store =
  globalStore.bluehopeDemoStore ??
  (globalStore.bluehopeDemoStore = {
    enquiries: [],
    bookings: [],
    savedProviders: [],
    reviews: [],
    reports: [],
    reviewReplies: {},
    availabilityOverrides: {},
  });

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isDemoRequest(request: Request) {
  return request.headers.get("x-bluehope-demo") === "true";
}

/**
 * Resolves which account a request belongs to. Demo/guest traffic shares the
 * "demo" workspace; signed-in users are isolated under their own key so one
 * account's enquiries, bookings, and saves never appear in another's
 * dashboard. (Interim identity marker until Firebase Admin verification is
 * configured; Firestore rules provide the real security boundary.)
 */
export function requestOwner(request: Request): string {
  if (isDemoRequest(request)) return "demo";

  const uid = request.headers.get("x-bluehope-uid")?.trim();
  return uid ? `user:${uid}` : "anonymous";
}

export function listDemoEnquiries(owner?: string) {
  return owner ? store.enquiries.filter((item) => item.owner === owner) : store.enquiries;
}

export function createDemoEnquiry(
  input: Omit<DemoEnquiry, "id" | "owner" | "listingName" | "status" | "createdAt">,
  owner = "demo",
) {
  const listing = demoProviders.find((provider) => provider.slug === input.listingSlug);
  if (!listing) throw new Error("listing_not_found");

  const enquiry: DemoEnquiry = {
    ...input,
    owner,
    id: id("enq"),
    listingName: listing.name,
    status: "new",
    createdAt: new Date().toISOString(),
  };
  store.enquiries.unshift(enquiry);
  return enquiry;
}

export function listDemoBookings(owner?: string) {
  return owner ? store.bookings.filter((item) => item.owner === owner) : store.bookings;
}

export function bookedSlotsFor(listingSlug: string, date: string) {
  return store.bookings
    .filter((booking) => booking.listingSlug === listingSlug && booking.date === date && booking.status === "confirmed")
    .map((booking) => booking.slotId);
}

export function getDemoAvailability(listingSlug: string, date: string) {
  const listing = demoProviders.find((provider) => provider.slug === listingSlug);
  if (!listing) throw new Error("listing_not_found");

  const override = store.availabilityOverrides[listingSlug]?.[date] ?? {};
  const booked = bookedSlotsFor(listingSlug, date);
  const slots = generateSlotsForDate(date, booked, defaultWeeklySchedule, {
    ...(override.capacity !== undefined || override.blockedSlots !== undefined
      ? {
          [date]: {
            ...(override.capacity !== undefined ? { capacity: override.capacity } : {}),
            ...(override.blockedSlots !== undefined ? { blockedSlots: override.blockedSlots } : {}),
          },
        }
      : {}),
  });
  const confirmedCount = booked.length;
  const capacity = override.capacity ?? 8;

  return {
    listingSlug,
    date,
    capacity,
    confirmedCount,
    remainingCapacity: Math.max(0, capacity - confirmedCount),
    fullyBooked: confirmedCount >= capacity || slots.every((slot) => slot.status !== "available"),
    slots,
  };
}

export function setDemoAvailabilityOverride(
  listingSlug: string,
  date: string,
  patch: AvailabilityOverride,
) {
  const listing = demoProviders.find((provider) => provider.slug === listingSlug);
  if (!listing) throw new Error("listing_not_found");

  const existing = store.availabilityOverrides[listingSlug]?.[date] ?? {};
  const next: AvailabilityOverride = {
    capacity: patch.capacity ?? existing.capacity,
    blockedSlots: patch.blockedSlots ?? existing.blockedSlots,
  };

  store.availabilityOverrides[listingSlug] = {
    ...store.availabilityOverrides[listingSlug],
    [date]: next,
  };

  return getDemoAvailability(listingSlug, date);
}

export function createDemoBooking(
  input: Omit<DemoBooking, "id" | "owner" | "listingName" | "start" | "end" | "status" | "createdAt">,
  owner = "demo",
) {
  const listing = demoProviders.find((provider) => provider.slug === input.listingSlug);
  if (!listing) throw new Error("listing_not_found");

  const availability = getDemoAvailability(input.listingSlug, input.date);
  const selectedSlot = availability.slots.find((slot) => slot.id === input.slotId);
  if (!selectedSlot || selectedSlot.status !== "available" || availability.fullyBooked) {
    throw new Error("slot_unavailable");
  }

  const alreadyBooked = store.bookings.some(
    (booking) =>
      booking.listingSlug === input.listingSlug &&
      booking.date === input.date &&
      booking.slotId === input.slotId &&
      booking.status === "confirmed",
  );
  if (alreadyBooked) throw new Error("slot_unavailable");

  const booking: DemoBooking = {
    ...input,
    owner,
    id: id("book"),
    listingName: listing.name,
    start: selectedSlot.start,
    end: selectedSlot.end,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

  store.bookings.unshift(booking);
  return booking;
}

export function listDemoSavedProviders(owner: string) {
  return store.savedProviders.filter((item) => item.owner === owner);
}

/** Adds or removes a saved listing for an account; returns the new saved state. */
export function setDemoSavedProvider(owner: string, listingSlug: string, saved: boolean) {
  const listing = demoProviders.find((provider) => provider.slug === listingSlug);
  if (!listing) throw new Error("listing_not_found");

  const existingIndex = store.savedProviders.findIndex(
    (item) => item.owner === owner && item.listingSlug === listingSlug,
  );

  if (!saved) {
    if (existingIndex >= 0) store.savedProviders.splice(existingIndex, 1);
    return { saved: false };
  }

  if (existingIndex < 0) {
    store.savedProviders.unshift({
      id: id("save"),
      owner,
      listingSlug,
      listingName: listing.name,
      createdAt: new Date().toISOString(),
    });
  }
  return { saved: true };
}

export function listDemoReviews(listingSlug: string) {
  const provider = demoProviders.find((item) => item.slug === listingSlug);
  if (!provider) throw new Error("listing_not_found");

  const merged = [
    ...store.reviews.filter((review) => review.listingSlug === listingSlug),
    ...reviewsForProfile(provider),
  ];

  return merged.map((review) =>
    store.reviewReplies[review.id]
      ? { ...review, providerReply: store.reviewReplies[review.id] }
      : review,
  );
}

export function createDemoReview(input: {
  listingSlug: string;
  authorName: string;
  rating: number;
  text: string;
  images: string[];
}) {
  const provider = demoProviders.find((item) => item.slug === input.listingSlug);
  if (!provider) throw new Error("listing_not_found");

  const review: Review = {
    id: id("rev"),
    listingSlug: input.listingSlug,
    authorName: input.authorName,
    rating: input.rating,
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date()),
    text: input.text,
    images: input.images,
    helpfulCount: 0,
    moderationStatus: "pending",
    verifiedInteraction: false,
  };
  store.reviews.unshift(review);
  return review;
}

export function createDemoReviewReport(input: { reviewId: string; reason: string }) {
  const report: DemoReport = {
    id: id("report"),
    reviewId: input.reviewId,
    reason: input.reason,
    createdAt: new Date().toISOString(),
  };
  store.reports.unshift(report);
  return report;
}

export function setDemoReviewReply(reviewId: string, text: string) {
  // Replies may target parent-submitted reviews or seeded demo reviews.
  const review =
    store.reviews.find((item) => item.id === reviewId) ??
    demoReviews.find((item) => item.id === reviewId);
  if (!review) throw new Error("review_not_found");

  const listing = demoProviders.find((provider) => provider.slug === review.listingSlug);
  const reply: ProviderReply = {
    authorName: listing?.name ?? "Provider",
    text,
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date()),
  };
  store.reviewReplies[reviewId] = reply;
  return reply;
}

// Status updates are provider-side actions, so they match by id regardless of
// which parent account created the enquiry.
export function updateDemoEnquiryStatus(enquiryId: string, status: EnquiryStatus) {
  const enquiry = store.enquiries.find((item) => item.id === enquiryId);
  if (!enquiry) return null;

  enquiry.status = status;
  return enquiry;
}
