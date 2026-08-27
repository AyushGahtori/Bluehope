import type { NextRequest } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/models/firestore";
import { persistencePending } from "@/server/api-responses";
import {
  createDemoEnquiry,
  listDemoEnquiries,
  requestOwner,
  updateDemoEnquiryStatus,
} from "@/server/demo-marketplace-store";
import {
  FirestoreUnavailableError,
  formatTimestamp,
  getListingDocBySlug,
  listEnquiriesForCustomer,
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
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  if (auth.authenticated && auth.firebaseUid) {
    try {
      if (auth.role === "institution" || auth.role === "soleProvider") {
        const enquiries = await listEnquiriesForProvider(auth.firebaseUid);
        return Response.json({ status: "ok", enquiries });
      }
      if (auth.role === "customer") {
        const enquiries = await listEnquiriesForCustomer(auth.firebaseUid);
        return Response.json({ status: "ok", enquiries });
      }
      // If role is undefined or admin, check both
      const providerEnquiries = await listEnquiriesForProvider(auth.firebaseUid);
      if (providerEnquiries.length > 0) {
        return Response.json({ status: "ok", enquiries: providerEnquiries });
      }
      const customerEnquiries = await listEnquiriesForCustomer(auth.firebaseUid);
      return Response.json({ status: "ok", enquiries: customerEnquiries });
    } catch (error) {
      if (error instanceof FirestoreUnavailableError) {
        return Response.json({
          status: "ok",
          enquiries: listDemoEnquiries(`user:${auth.firebaseUid}`),
        });
      }
      throw error;
    }
  }

  if (owner !== "anonymous") {
    if (owner.startsWith("user:")) {
      const uid = owner.slice(5);
      try {
        const providerEnquiries = await listEnquiriesForProvider(uid);
        if (providerEnquiries.length > 0) {
          return Response.json({ status: "ok", enquiries: providerEnquiries });
        }
        const customerEnquiries = await listEnquiriesForCustomer(uid);
        if (customerEnquiries.length > 0) {
          return Response.json({ status: "ok", enquiries: customerEnquiries });
        }
      } catch {
        // Fallback to demo store
      }
    }
    return Response.json({ status: "ok", enquiries: listDemoEnquiries(owner) });
  }

  return Response.json({ status: "ok", enquiries: [] });
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const parsed = enquirySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const customerUid = auth.firebaseUid || (owner.startsWith("user:") ? owner.slice(5) : "anonymous");
  const firestore = getAdminFirestore();

  // 1. Check if the target is a real Firestore listing (institution / provider profile)
  if (firestore) {
    try {
      const listing = await getListingDocBySlug(parsed.data.listingSlug);
      if (listing) {
        const enquiryRef = firestore.collection(COLLECTIONS.enquiries).doc();
        const now = FieldValue.serverTimestamp();
        const enquiry = {
          id: enquiryRef.id,
          customerUid,
          providerUid: listing.ownerUid,
          listingId: listing.id,
          listingSlug: parsed.data.listingSlug,
          listingName: listing.name,
          parentName: parsed.data.parentName,
          phone: parsed.data.phone,
          serviceId: parsed.data.serviceId,
          ...(parsed.data.childName ? { childName: parsed.data.childName } : {}),
          message: parsed.data.message,
          status: "new",
          createdAt: now,
        };
        await enquiryRef.set(enquiry);

        // Add initial message into messages subcollection for chat
        const msgRef = enquiryRef.collection("messages").doc();
        await msgRef.set({
          id: msgRef.id,
          senderRole: "parent",
          senderUid: customerUid,
          kind: "text",
          text: parsed.data.message,
          createdAt: now,
        });

        // Mirror in demo store for unified offline lookup if matching slug
        try {
          createDemoEnquiry(parsed.data, `user:${customerUid}`);
        } catch {
          // not in static demo array
        }

        return Response.json(
          {
            status: "created",
            enquiry: {
              ...enquiry,
              createdAt: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }
    } catch (err) {
      if (!(err instanceof FirestoreUnavailableError)) {
        console.error("Error creating enquiry in Firestore:", err);
      }
    }
  }

  // 2. If not a Firestore listing, save to demo store
  try {
    const enquiry = createDemoEnquiry(
      parsed.data,
      customerUid !== "anonymous" ? `user:${customerUid}` : owner,
    );
    return Response.json({ status: "created", enquiry }, { status: 201 });
  } catch {
    return Response.json(
      { status: "not_found", resource: "listing", message: "Provider or Institute not found." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const parsed = enquiryStatusSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const reference = firestore.collection(COLLECTIONS.enquiries).doc(parsed.data.id);
      const snapshot = await reference.get();
      if (snapshot.exists) {
        await reference.set(
          { status: parsed.data.status, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
        return Response.json({ status: "updated" });
      }
    } catch (err) {
      if (!(err instanceof FirestoreUnavailableError)) {
        console.error("Error updating enquiry status in Firestore:", err);
      }
    }
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
