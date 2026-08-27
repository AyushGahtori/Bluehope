import type { NextRequest } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/models/firestore";
import {
  appendDemoText,
  getOrCreateDemoConversation,
  listDemoConversations,
  requestDemoAppointment,
  setDemoAppointmentStatus,
} from "@/server/demo-conversation-store";
import { listDemoEnquiries, requestOwner } from "@/server/demo-marketplace-store";
import { formatTimestamp, FirestoreUnavailableError } from "@/server/firestore/repositories";
import { getAdminFirestore } from "@/server/firebase/admin";
import { resolveAuthContext } from "@/server/middleware/auth";

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
  const enquiryId = id.startsWith("conv-") ? id.slice("conv-".length) : id;
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const enquiryDoc = await firestore.collection(COLLECTIONS.enquiries).doc(enquiryId).get();
      if (enquiryDoc.exists) {
        const enquiryData = enquiryDoc.data()!;
        const snapshot = await firestore
          .collection(COLLECTIONS.enquiries)
          .doc(enquiryId)
          .collection("messages")
          .orderBy("createdAt", "asc")
          .get();

        if (snapshot.empty) {
          const initialMessage = {
            id: `msg-init-${enquiryId}`,
            senderRole: "parent" as const,
            kind: "text" as const,
            text: enquiryData.message,
            createdAt: formatTimestamp(enquiryData.createdAt),
          };
          return Response.json({ status: "ok", messages: [initialMessage] });
        }

        const messages = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            senderRole: d.senderRole,
            kind: d.kind ?? "text",
            text: d.text,
            appointment: d.appointment,
            createdAt: formatTimestamp(d.createdAt),
          };
        });

        return Response.json({ status: "ok", messages });
      }
    } catch (err) {
      if (!(err instanceof FirestoreUnavailableError)) {
        console.error("Error retrieving conversation messages from Firestore:", err);
      }
    }
  }

  // Fallback to demo store
  const effectiveOwner = auth.authenticated ? `user:${auth.firebaseUid}` : owner;
  const conversations = listDemoConversations(effectiveOwner);
  let conversation = conversations.find(
    (item) => item.id === id || item.id === `conv-${enquiryId}` || item.id === enquiryId,
  );

  if (!conversation) {
    const enquiry = listDemoEnquiries().find((item) => item.id === enquiryId);
    if (enquiry) {
      conversation = getOrCreateDemoConversation(effectiveOwner, {
        id: enquiry.id,
        parentName: enquiry.parentName,
        serviceId: enquiry.serviceId,
        message: enquiry.message,
        createdAt: enquiry.createdAt,
      });
    }
  }

  if (!conversation) {
    return Response.json({ status: "ok", messages: [] });
  }

  return Response.json({ status: "ok", messages: conversation.messages });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const enquiryId = id.startsWith("conv-") ? id.slice("conv-".length) : id;
  const auth = await resolveAuthContext(request);
  const owner = requestOwner(request);

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json(
      { status: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const enquiryDoc = await firestore.collection(COLLECTIONS.enquiries).doc(enquiryId).get();
      if (enquiryDoc.exists) {
        const enquiryData = enquiryDoc.data()!;
        const senderRole: "provider" | "parent" =
          auth.firebaseUid && auth.firebaseUid === enquiryData.providerUid
            ? "provider"
            : auth.role === "institution" || auth.role === "soleProvider"
              ? "provider"
              : "parent";

        const body = parsed.data;

        if (body.kind === "text") {
          const msgRef = firestore
            .collection(COLLECTIONS.enquiries)
            .doc(enquiryId)
            .collection("messages")
            .doc();
          const now = FieldValue.serverTimestamp();
          const message = {
            id: msgRef.id,
            senderRole,
            senderUid: auth.firebaseUid ?? (owner.startsWith("user:") ? owner.slice(5) : "anonymous"),
            kind: "text",
            text: body.text,
            createdAt: now,
          };
          await msgRef.set(message);

          if (senderRole === "provider" && enquiryData.status === "new") {
            await enquiryDoc.ref.set({ status: "responded", updatedAt: now }, { merge: true });
          }

          return Response.json(
            { status: "created", message: { ...message, createdAt: new Date().toISOString() } },
            { status: 201 },
          );
        }

        if (body.kind === "appointment") {
          const apptId = `appt-${Date.now()}`;
          const appt = {
            id: apptId,
            date: body.date,
            time: body.time,
            serviceId: enquiryData.serviceId,
            status: "requested" as const,
          };
          const msgRef = firestore
            .collection(COLLECTIONS.enquiries)
            .doc(enquiryId)
            .collection("messages")
            .doc();
          const now = FieldValue.serverTimestamp();
          const message = {
            id: msgRef.id,
            senderRole,
            senderUid: auth.firebaseUid ?? "anonymous",
            kind: "appointment",
            appointment: appt,
            createdAt: now,
          };
          await msgRef.set(message);

          return Response.json(
            {
              status: "created",
              appointment: appt,
              message: { ...message, createdAt: new Date().toISOString() },
            },
            { status: 201 },
          );
        }

        if (body.kind === "appointment_action") {
          const msgsSnapshot = await firestore
            .collection(COLLECTIONS.enquiries)
            .doc(enquiryId)
            .collection("messages")
            .where("kind", "==", "appointment")
            .get();

          const targetMsgDoc = msgsSnapshot.docs.find(
            (d) => d.data().appointment?.id === body.appointmentId,
          );

          const status =
            body.action === "confirm"
              ? "confirmed"
              : body.action === "decline"
                ? "declined"
                : "cancelled";

          if (targetMsgDoc) {
            const currentAppt = targetMsgDoc.data().appointment;
            const updatedAppt = { ...currentAppt, status };
            await targetMsgDoc.ref.set(
              { appointment: updatedAppt, updatedAt: FieldValue.serverTimestamp() },
              { merge: true },
            );

            if (status === "confirmed") {
              const bookingRef = firestore.collection(COLLECTIONS.bookings).doc();
              await bookingRef.set({
                id: bookingRef.id,
                customerUid: enquiryData.customerUid,
                providerUid: enquiryData.providerUid,
                listingId: enquiryData.listingId,
                listingSlug: enquiryData.listingSlug,
                listingName: enquiryData.listingName,
                parentName: enquiryData.parentName,
                childName: enquiryData.childName ?? "Child",
                serviceId: enquiryData.serviceId,
                date: currentAppt.date,
                time: currentAppt.time,
                start: currentAppt.time,
                end: currentAppt.time,
                status: "confirmed",
                createdAt: FieldValue.serverTimestamp(),
              });
            }

            return Response.json({ status: "updated", appointment: updatedAppt });
          }
        }
      }
    } catch (err) {
      if (!(err instanceof FirestoreUnavailableError)) {
        console.error("Error creating conversation message in Firestore:", err);
      }
    }
  }

  // Fallback to demo store
  const effectiveOwner = auth.authenticated ? `user:${auth.firebaseUid}` : owner;
  const body = parsed.data;

  if (body.kind === "text") {
    const message = appendDemoText(effectiveOwner, `conv-${enquiryId}`, "provider", body.text);
    if (!message) {
      const conv = getOrCreateDemoConversation(effectiveOwner, {
        id: enquiryId,
        parentName: "Parent",
        serviceId: "speech-therapy",
        message: body.text,
        createdAt: new Date().toISOString(),
      });
      const fallbackMsg = appendDemoText(effectiveOwner, conv.id, "provider", body.text);
      return Response.json(
        { status: "created", message: fallbackMsg ?? conv.messages[0] },
        { status: 201 },
      );
    }
    return Response.json({ status: "created", message }, { status: 201 });
  }

  if (body.kind === "appointment") {
    const result = requestDemoAppointment(effectiveOwner, `conv-${enquiryId}`, {
      date: body.date,
      time: body.time,
    });
    if (!result) {
      return Response.json({ status: "not_found", resource: "conversation" }, { status: 404 });
    }
    return Response.json({ status: "created", ...result }, { status: 201 });
  }

  const appointment = setDemoAppointmentStatus(
    effectiveOwner,
    `conv-${enquiryId}`,
    body.appointmentId,
    body.action === "confirm" ? "confirmed" : body.action === "decline" ? "declined" : "cancelled",
  );
  return Response.json({ status: "updated", appointment });
}