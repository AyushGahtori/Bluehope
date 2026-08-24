import type { NextRequest } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { persistencePending } from "@/server/api-responses";
import {
  createDemoEnquiry,
  listDemoEnquiries,
  requestOwner,
  updateDemoEnquiryStatus,
} from "@/server/demo-marketplace-store";
import {
  FirestoreUnavailableError,
  listEnquiriesForProvider,
} from "@/server/firestore/repositories";
import { getAdminFirestore } from "@/server/firebase/admin";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

const enquirySchema = z.object({
  listingSlug: z.string().min(1),
  parentName: z.string().min(1).max(120),
  phone: z.string().min(8).max(30),
  serviceId: z.string().min(1),
  childName: z.string().max(120).optional(),
  message: z.string().min(1).max(2000),
});

const enquiryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "responded", "in_progress", "closed"]),
});

export async function GET(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    return Response.json({ status: "ok", enquiries: listDemoEnquiries(owner) });
  }

  // Authenticated provider/institute: only their own enquiries, scoped by the
  // verified Firebase UID directly in the Firestore query.
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const enquiries = await listEnquiriesForProvider(auth.firebaseUid!);
    return Response.json({ status: "ok", enquiries });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return persistencePending("enquiries");
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    const parsed = enquirySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return Response.json(
        { status: "invalid_body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const enquiry = createDemoEnquiry(parsed.data, owner);
      return Response.json({ status: "created", enquiry }, { status: 201 });
    } catch {
      return Response.json(
        { status: "not_found", resource: "listing" },
        { status: 404 },
      );
    }
  }

  // Authenticated parent: create a real Firestore enquiry when the listing
  // exists in Firestore; demo listings keep using the demo workspace so the
  // two data planes never mix.
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  const firestore = getAdminFirestore();
  if (!firestore) return persistencePending("enquiry");

  const parsed = enquirySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const listingSnapshot = await firestore
      .collection("listings")
      .where("slug", "==", parsed.data.listingSlug)
      .limit(1)
      .get();

    if (listingSnapshot.empty) {
      const enquiry = createDemoEnquiry(parsed.data, `user:${auth.firebaseUid}`);
      return Response.json({ status: "created", enquiry }, { status: 201 });
    }

    const listing = listingSnapshot.docs[0];
    const enquiryRef = firestore.collection("enquiries").doc();
    const enquiry = {
      id: enquiryRef.id,
      customerUid: auth.firebaseUid!,
      providerUid: listing.data().ownerUid ?? null,
      listingId: listing.id,
      listingSlug: parsed.data.listingSlug,
      listingName: listing.data().name ?? parsed.data.listingSlug,
      parentName: parsed.data.parentName,
      phone: parsed.data.phone,
      serviceId: parsed.data.serviceId,
      ...(parsed.data.childName ? { childName: parsed.data.childName } : {}),
      message: parsed.data.message,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
    };
    await enquiryRef.set(enquiry);
    return Response.json({ status: "created", enquiry }, { status: 201 });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return persistencePending("enquiry");
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const owner = requestOwner(request);
  if (owner !== "anonymous") {
    const parsed = enquiryStatusSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return Response.json(
        { status: "invalid_body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = updateDemoEnquiryStatus(parsed.data.id, parsed.data.status);
    if (!updated) {
      return Response.json(
        { status: "not_found", resource: "enquiry" },
        { status: 404 },
      );
    }

    return Response.json({ status: "updated", enquiry: updated });
  }

  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  const firestore = getAdminFirestore();
  if (!firestore) return persistencePending("enquiry status");

  const parsed = enquiryStatusSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const reference = firestore.collection("enquiries").doc(parsed.data.id);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return Response.json({ status: "not_found", resource: "enquiry" }, { status: 404 });
    }

    // Only a participant (the enquiry's provider or customer) may update it.
    const data = snapshot.data() as Record<string, unknown>;
    if (data.providerUid !== auth.firebaseUid && data.customerUid !== auth.firebaseUid) {
      return Response.json({ status: "forbidden" }, { status: 403 });
    }

    await reference.set(
      { status: parsed.data.status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return Response.json({ status: "updated" });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return persistencePending("enquiry status");
    throw error;
  }
}
