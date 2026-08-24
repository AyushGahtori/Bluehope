/**
 * In-memory demo backing store for the inquiry → conversation → messages →
 * appointment loop. Mirrors the canonical Firestore shape documented in
 * src/models/firestore.ts so the authenticated implementation can swap in
 * without changing API contracts.
 */

export type DemoAppointmentStatus = "requested" | "confirmed" | "declined" | "cancelled";

export type DemoAppointment = {
  id: string;
  date: string;
  time: string;
  serviceId: string;
  status: DemoAppointmentStatus;
};

export type DemoConversationMessage = {
  id: string;
  senderRole: "parent" | "provider" | "system";
  kind: "text" | "appointment";
  text?: string;
  appointment?: DemoAppointment;
  createdAt: string;
};

export type DemoConversation = {
  id: string;
  enquiryId: string;
  parentName: string;
  serviceId: string;
  messages: DemoConversationMessage[];
};

const conversationsByOwner = new Map<string, Map<string, DemoConversation>>();

function bucketFor(owner: string) {
  let bucket = conversationsByOwner.get(owner);
  if (!bucket) {
    bucket = new Map();
    conversationsByOwner.set(owner, bucket);
  }
  return bucket;
}

function nowIso() {
  return new Date().toISOString();
}

export function getOrCreateDemoConversation(
  owner: string,
  enquiry: {
    id: string;
    parentName: string;
    serviceId: string;
    message: string;
    createdAt: string;
  },
): DemoConversation {
  const bucket = bucketFor(owner);
  const existing = bucket.get(enquiry.id);
  if (existing) return existing;

  const conversation: DemoConversation = {
    id: `conv-${enquiry.id}`,
    enquiryId: enquiry.id,
    parentName: enquiry.parentName,
    serviceId: enquiry.serviceId,
    messages: [
      {
        id: `${enquiry.id}-m0`,
        senderRole: "parent",
        kind: "text",
        text: enquiry.message,
        createdAt: enquiry.createdAt,
      },
    ],
  };
  bucket.set(enquiry.id, conversation);
  return conversation;
}

export function listDemoConversations(owner: string): DemoConversation[] {
  return [...bucketFor(owner).values()];
}

export function appendDemoText(
  owner: string,
  conversationId: string,
  senderRole: "parent" | "provider",
  text: string,
): DemoConversationMessage | null {
  const conversation = bucketFor(owner).get(conversationId.replace(/^conv-/, ""));
  if (!conversation) return null;

  const message: DemoConversationMessage = {
    id: `${conversation.id}-m${conversation.messages.length}-${Date.now()}`,
    senderRole,
    kind: "text",
    text,
    createdAt: nowIso(),
  };
  conversation.messages.push(message);
  return message;
}

export function requestDemoAppointment(
  owner: string,
  conversationId: string,
  input: { date: string; time: string },
): { message: DemoConversationMessage; appointment: DemoAppointment } | null {
  const conversation = bucketFor(owner).get(conversationId.replace(/^conv-/, ""));
  if (!conversation) return null;

  const appointment: DemoAppointment = {
    id: `apt-${conversation.enquiryId}-${Date.now()}`,
    date: input.date,
    time: input.time,
    serviceId: conversation.serviceId,
    status: "requested",
  };
  const message: DemoConversationMessage = {
    id: `${conversation.id}-a${conversation.messages.length}-${Date.now()}`,
    senderRole: "system",
    kind: "appointment",
    appointment,
    createdAt: nowIso(),
  };
  conversation.messages.push(message);
  return { message, appointment };
}

export function setDemoAppointmentStatus(
  owner: string,
  conversationId: string,
  appointmentId: string,
  status: "confirmed" | "declined" | "cancelled",
): DemoAppointment | null {
  const conversation = bucketFor(owner).get(conversationId.replace(/^conv-/, ""));
  if (!conversation) return null;

  const entry = conversation.messages.find(
    (message) => message.appointment?.id === appointmentId,
  );
  if (!entry?.appointment) return null;

  entry.appointment.status = status;
  conversation.messages.push({
    id: `${conversation.id}-s${conversation.messages.length}-${Date.now()}`,
    senderRole: "system",
    kind: "text",
    text:
      status === "confirmed"
        ? "Appointment confirmed."
        : status === "declined"
          ? "Appointment declined by the provider."
          : "Appointment cancelled.",
    createdAt: nowIso(),
  });
  return entry.appointment;
}

export function listDemoAppointments(owner: string): DemoAppointment[] {
  const appointments: DemoAppointment[] = [];
  for (const conversation of bucketFor(owner).values()) {
    for (const message of conversation.messages) {
      if (message.appointment) appointments.push(message.appointment);
    }
  }
  return appointments.sort((a, b) => a.date.localeCompare(b.date));
}