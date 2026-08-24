import type { NextRequest } from "next/server";
import { persistencePending } from "@/server/api-responses";
import { listDemoAppointments } from "@/server/demo-conversation-store";
import {
  FirestoreUnavailableError,
  listBookingsForProvider,
} from "@/server/firestore/repositories";
import {
  protectedPendingResponse,
  resolveAuthContext,
} from "@/server/middleware/auth";

function isoDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate(): Date }).toDate().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function isoTime(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate(): Date }).toDate().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  const header = request.headers.get("x-bluehope-demo");
  const owner = header && header !== "anonymous" ? header : "anonymous";

  if (owner !== "anonymous") {
    return Response.json({ status: "ok", appointments: listDemoAppointments(owner) });
  }

  // Authenticated provider/institute: only bookings that belong to this
  // account, scoped by the verified Firebase UID in the query itself.
  const auth = await resolveAuthContext(request);
  if (!auth.authenticated) return protectedPendingResponse(auth);

  try {
    const bookings = await listBookingsForProvider(auth.firebaseUid!);
    const appointments = bookings.map((booking) => {
      const data = booking as Record<string, unknown>;
      return {
        id: String(data.id ?? ""),
        date: isoDate(data.startsAt ?? data.date),
        time: isoTime(data.startsAt) || String(data.time ?? ""),
        serviceId: String(data.serviceId ?? "appointment"),
        status: String(data.status ?? "requested"),
      };
    });
    return Response.json({ status: "ok", appointments });
  } catch (error) {
    if (error instanceof FirestoreUnavailableError) return persistencePending("appointments");
    throw error;
  }
}