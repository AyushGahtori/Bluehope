"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, MessageSquare, Send, Star } from "lucide-react";
import { Badge, Button, Card, Input, SectionTitle } from "@/components/ui/primitives";
import type { Review } from "@/data/marketplace";
import { authedApiHeaders, isConfigurationPendingResponse } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * All inbox data is fetched with the caller's Firebase ID token. The server
 * resolves the caller's own listing/UID and scopes every query to it — demo
 * headers are never used for authenticated accounts.
 */
async function inboxHeaders() {
  const headers = await authedApiHeaders();
  if (!headers) throw new Error("unauthenticated");
  return headers;
}

type EnquiryStatus = "new" | "responded" | "in_progress" | "closed";

type Enquiry = {
  id: string;
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

type AppointmentStatus = "requested" | "confirmed" | "declined" | "cancelled";

type DemoAppointment = {
  id: string;
  date: string;
  time: string;
  serviceId: string;
  status: AppointmentStatus;
};

type ConversationMessage = {
  id: string;
  senderRole: "parent" | "provider" | "system";
  kind: "text" | "appointment";
  text?: string;
  appointment?: DemoAppointment;
  createdAt: string;
};

type ConversationViewerRole = "parent" | "provider";

const statusLabels: Record<EnquiryStatus, string> = {
  new: "New",
  responded: "Responded",
  in_progress: "In Progress",
  closed: "Closed",
};

const statusTones: Record<EnquiryStatus, "amber" | "green" | "blue" | "neutral"> = {
  new: "amber",
  responded: "green",
  in_progress: "blue",
  closed: "neutral",
};

const appointmentTones: Record<AppointmentStatus, "amber" | "green" | "neutral"> = {
  requested: "amber",
  confirmed: "green",
  declined: "neutral",
  cancelled: "neutral",
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

function formatService(serviceId: string) {
  return serviceId.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function useEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(
    async () => {
      const headers = await inboxHeaders();
      return fetch("/api/enquiries", { headers, cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("request_failed");
          return response.json() as Promise<{ enquiries?: Enquiry[] }>;
        })
        .then((data) => {
          setEnquiries(data.enquiries ?? []);
          setError("");
        })
        .catch(() => {
          setError("We couldn't load enquiries right now. Please try again.");
        });
    },
    [],
  );

  useEffect(() => {
    let ignore = false;
    void refresh().finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [refresh]);

  const updateStatus = async (id: string, status: EnquiryStatus) => {
    setEnquiries((current) =>
      current.map((enquiry) => (enquiry.id === id ? { ...enquiry, status } : enquiry)),
    );
    const response = await fetch("/api/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await inboxHeaders()) },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) {
      setError("We couldn't update that enquiry. Please try again.");
      void refresh();
    }
  };

  return { enquiries, loading, error, updateStatus };
}

/**
 * Full conversation view for one inquiry: message thread, replies, and
 * appointment requests with confirm/decline actions.
 */
export function ConversationPanel({
  enquiry,
  onBack,
  viewerRole = "provider",
}: {
  enquiry: Enquiry;
  onBack: () => void;
  viewerRole?: ConversationViewerRole;
}) {
  const conversationId = `conv-${enquiry.id}`;
  const counterpartName =
    viewerRole === "parent" ? enquiry.listingName : enquiry.parentName;
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [apptDate, setApptDate] = useState(todayIso());
  const [apptTime, setApptTime] = useState("10:00");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async () => {
      const headers = await inboxHeaders();
      return fetch(`/api/conversations/${conversationId}/messages`, { headers, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("request_failed");
          return (await response.json()) as Promise<{ messages?: ConversationMessage[] }>;
        })
        .then((data) => {
          setMessages(data.messages ?? []);
          setError("");
        })
        .catch(() => {
          setError("We couldn't load this conversation right now. Please try again.");
        });
    },
    [conversationId],
  );

  useEffect(() => {
    let ignore = false;
    void loadMessages().finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const post = async (body: unknown) => {
    setSending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await inboxHeaders()) },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError("That action didn't go through. Please try again.");
        return false;
      }
      await loadMessages();
      return true;
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    await post({ kind: "text", text });
  };

  const requestAppointment = async () => {
    if (sending) return;
    await post({ kind: "appointment", date: apptDate, time: apptTime });
  };

  const actOnAppointment = async (appointmentId: string, action: "confirm" | "decline") => {
    await post({ kind: "appointment_action", appointmentId, action });
  };

  const appointmentTitleFor = (message: ConversationMessage) => {
    if (message.senderRole === "provider") return "Appointment proposal";
    return "Appointment request";
  };

  const appointmentStatusFor = (message: ConversationMessage) => {
    const status = message.appointment?.status ?? "requested";
    if (status !== "requested") return appointmentStatusLabels[status];
    if (message.senderRole === viewerRole) {
      return message.senderRole === "provider"
        ? "Approval pending"
        : "Request sent";
    }
    return message.senderRole === "provider" ? "Proposed" : "Requested";
  };

  return (
    <Card className="flex h-[640px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-950">
            {counterpartName}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {formatService(enquiry.serviceId)} · via Contact Now
          </p>
        </div>
        <Button variant="outline" className="h-9 px-3 text-xs" onClick={onBack}>
          Back to list
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 px-5 py-4">
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded-[10px] bg-white" />
            ))}
          </div>
        ) : (
          messages.map((message) => {
            if (message.kind === "appointment" && message.appointment) {
              const appointment = message.appointment;
              const canActOnAppointment =
                appointment.status === "requested" &&
                message.senderRole !== "system" &&
                message.senderRole !== viewerRole;
              return (
                <div key={message.id} className="rounded-[10px] border border-blue-100 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-950 flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-bluehope" />
                      {appointmentTitleFor(message)}
                    </p>
                    <Badge tone={appointmentTones[appointment.status]}>
                      {appointmentStatusFor(message)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatService(appointment.serviceId)} · {appointment.date} at {appointment.time}
                  </p>
                  {canActOnAppointment ? (
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="h-9 px-4"
                        disabled={sending}
                        onClick={() => actOnAppointment(appointment.id, "confirm")}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 px-4"
                        disabled={sending}
                        onClick={() => actOnAppointment(appointment.id, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  ) : appointment.status === "requested" ? (
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      Waiting for the other side to respond.
                    </p>
                  ) : null}
                </div>
              );
            }

            const mine = message.senderRole === viewerRole;
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-[12px] px-4 py-2.5 text-sm leading-6",
                    mine ? "bg-bluehope text-white" : "bg-white text-slate-700 shadow-card",
                  )}
                >
                  {message.text}
                  <span className={cn("mt-1 block text-[11px]", mine ? "text-blue-100" : "text-slate-400")}>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendText();
              }
            }}
            placeholder={`Reply to ${counterpartName}...`}
            aria-label="Reply message"
          />
          <Button onClick={sendText} disabled={sending || !draft.trim()} aria-label="Send reply">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[10px] bg-soft-blue p-3">
          <label className="text-xs font-semibold text-slate-600">
            {viewerRole === "provider" ? "Propose appointment" : "Request appointment"}
            <Input
              type="date"
              value={apptDate}
              min={todayIso()}
              onChange={(event) => setApptDate(event.target.value)}
              className="mt-1 h-10"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Time
            <Input
              type="time"
              value={apptTime}
              onChange={(event) => setApptTime(event.target.value)}
              className="mt-1 h-10"
            />
          </label>
          <Button variant="outline" className="h-10" disabled={sending} onClick={requestAppointment}>
            {viewerRole === "provider" ? "Propose appointment" : "Send request"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ProviderEnquiriesSection() {
  const { enquiries, loading, error, updateStatus } = useEnquiries();
  const [openEnquiryId, setOpenEnquiryId] = useState<string | null>(null);

  const openEnquiry = enquiries.find((item) => item.id === openEnquiryId);

  if (openEnquiry) {
    return <ConversationPanel key={openEnquiry.id} enquiry={openEnquiry} onBack={() => setOpenEnquiryId(null)} />;
  }

  return (
    <Card className="p-6">
      <SectionTitle title="New Enquiries" action={<Badge tone="neutral">{enquiries.length} total</Badge>} />
      {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-[8px] bg-slate-100" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-[8px] bg-soft-blue p-6 text-center">
          <p className="font-bold text-slate-950">No enquiries yet.</p>
          <p className="mt-1 text-sm text-slate-600">
            When a parent uses Contact Now on your profile, their request appears here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <div key={enquiry.id} className="rounded-[8px] border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">{enquiry.parentName}</p>
                  <p className="mt-1 text-sm text-slate-600">Service: {formatService(enquiry.serviceId)}</p>
                  {enquiry.childName ? (
                    <p className="mt-1 text-sm text-slate-600">Child context: {enquiry.childName}</p>
                  ) : null}
                  <p className="mt-1 text-sm leading-6 text-slate-600">Message: {enquiry.message}</p>
                  <p className="mt-1 text-sm text-slate-500">Phone: {enquiry.phone}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {enquiry.listingName} · {new Date(enquiry.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={statusTones[enquiry.status]}>{statusLabels[enquiry.status]}</Badge>
                  <Button className="h-9 px-4" onClick={() => setOpenEnquiryId(enquiry.id)}>
                    <MessageSquare className="h-4 w-4" />
                    Open chat
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(statusLabels) as EnquiryStatus[])
                      .filter((status) => status !== enquiry.status)
                      .map((status) => (
                        <Button
                          key={status}
                          variant={status === "closed" ? "ghost" : "outline"}
                          className="h-8 px-3 text-xs"
                          onClick={() => updateStatus(enquiry.id, status)}
                        >
                          Mark {statusLabels[status]}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ProviderMessagesSection() {
  const { enquiries, loading, error, updateStatus } = useEnquiries();
  const [openEnquiryId, setOpenEnquiryId] = useState<string | null>(null);

  const openEnquiry = enquiries.find((item) => item.id === openEnquiryId);

  if (openEnquiry) {
    return <ConversationPanel key={openEnquiry.id} enquiry={openEnquiry} onBack={() => setOpenEnquiryId(null)} />;
  }

  return (
    <Card className="p-6">
      <SectionTitle title="Messages" action={<Badge tone="amber">{enquiries.filter((item) => item.status === "new").length} unread</Badge>} />
      {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-[8px] bg-slate-100" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-[8px] bg-soft-blue p-6 text-center">
          <p className="font-bold text-slate-950">No messages yet.</p>
          <p className="mt-1 text-sm text-slate-600">Parent contact requests arrive here as conversations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className="flex w-full items-start gap-4 border-b border-slate-100 py-4 text-left last:border-0"
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold",
                  enquiry.status === "new" ? "bg-blue-100 text-bluehope ring-4 ring-blue-50" : "bg-slate-100 text-slate-500",
                )}
              >
                {enquiry.parentName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">{enquiry.parentName}</p>
                  <span className="text-xs text-slate-500">{new Date(enquiry.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{enquiry.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={statusTones[enquiry.status]}>{statusLabels[enquiry.status]}</Badge>
                  <Badge tone="blue">{formatService(enquiry.serviceId)}</Badge>
                  <Button
                    className="h-8 px-3 text-xs"
                    onClick={() => setOpenEnquiryId(enquiry.id)}
                  >
                    Open chat
                  </Button>
                  {enquiry.status === "new" ? (
                    <Button
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      onClick={() => updateStatus(enquiry.id, "responded")}
                    >
                      Mark Responded
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ProviderAppointmentsSection() {
  const [appointments, setAppointments] = useState<DemoAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const headers = await inboxHeaders();
        const response = await fetch("/api/appointments", { headers, cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (ignore) return;
        if (!response.ok) {
          if (isConfigurationPendingResponse(response.status, body)) {
            setAppointments([]);
          } else {
            setError("We couldn't load appointments right now. Please try again.");
          }
          return;
        }
        setAppointments((body as { appointments?: DemoAppointment[] })?.appointments ?? []);
      } catch {
        if (!ignore) setError("We couldn't load appointments right now. Please try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const today = todayIso();
  const groups: Array<{ label: string; items: DemoAppointment[] }> = [
    { label: "Today", items: appointments.filter((item) => item.date === today && item.status !== "cancelled") },
    {
      label: "Upcoming",
      items: appointments.filter((item) => item.date > today && item.status !== "cancelled"),
    },
    {
      label: "Past & Cancelled",
      items: appointments.filter((item) => item.date < today || item.status === "cancelled"),
    },
  ];

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-[8px] bg-slate-100" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarCheck className="mx-auto h-8 w-8 text-bluehope" />
          <p className="mt-3 font-bold text-slate-950">No appointments yet.</p>
          <p className="mt-1 text-sm text-slate-600">
            When you propose or a parent accepts an appointment inside a conversation, it appears here.
          </p>
        </Card>
      ) : (
        groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <div key={group.label}>
              <SectionTitle title={group.label} />
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {group.items.map((appointment) => (
                  <Card key={appointment.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <CalendarCheck className="h-6 w-6 text-bluehope" />
                      <Badge tone={appointmentTones[appointment.status]}>{appointment.status}</Badge>
                    </div>
                    <p className="mt-4 text-xl font-bold">{formatService(appointment.serviceId)}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.date} · {appointment.time}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

export function ProviderReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const headers = await inboxHeaders();
        const response = await fetch("/api/reviews", { headers, cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (ignore) return;
        if (!response.ok) {
          // Persistence not configured in this environment is a healthy empty
          // state, not a technical failure.
          if (isConfigurationPendingResponse(response.status, body)) {
            setReviews([]);
          } else {
            setError("We couldn't load your reviews. Please try again.");
          }
          return;
        }
        setReviews((body as { reviews?: Review[] })?.reviews ?? []);
      } catch {
        if (!ignore) setError("We couldn't load your reviews. Please try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const saveReply = async (reviewId: string) => {
    const text = (drafts[reviewId] ?? "").trim();
    if (!text) return;

    setSavingId(reviewId);
    const response = await fetch("/api/reviews/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await inboxHeaders()) },
      body: JSON.stringify({ reviewId, text }),
    });
    setSavingId(null);

    if (!response.ok) {
      setError("We couldn't save that reply. Please try again.");
      return;
    }

    const data = (await response.json()) as { reply: Review["providerReply"] };
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId ? { ...review, providerReply: data.reply } : review,
      ),
    );
    setDrafts((current) => ({ ...current, [reviewId]: "" }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <Card className="p-6">
        <SectionTitle title="Reviews & Ratings" action={<Badge tone="green">Reply enabled</Badge>} />
        {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-28 animate-pulse rounded-[8px] bg-slate-100" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[8px] bg-soft-blue p-6 text-center">
            <p className="font-bold text-slate-950">{"You don't have any reviews yet."}</p>
            <p className="mt-1 text-sm text-slate-600">
              Reviews from families will appear here after they share their experience.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-slate-100 py-4 last:border-0">
              <div className="flex items-center justify-between">
                <p className="font-bold">{review.authorName}</p>
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  {review.rating}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{review.text}</p>
              {review.providerReply ? (
                <div className="mt-3 rounded-[8px] bg-blue-50 p-3">
                  <p className="text-xs font-bold text-bluehope">
                    Your reply · {review.providerReply.date}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{review.providerReply.text}</p>
                </div>
              ) : (
                <>
                  <textarea
                    className="mt-3 min-h-20 w-full rounded-[10px] border border-slate-200 p-3 text-sm outline-none focus:border-bluehope focus:ring-4 focus:ring-blue-100"
                    placeholder="Write a provider reply..."
                    value={drafts[review.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [review.id]: event.target.value }))
                    }
                  />
                  <Button
                    variant="outline"
                    className="mt-2 h-9"
                    disabled={savingId === review.id || !(drafts[review.id] ?? "").trim()}
                    onClick={() => saveReply(review.id)}
                  >
                    {savingId === review.id ? "Saving..." : "Save Reply"}
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </Card>
      <Card className="p-6">
        <SectionTitle title="Opening Hours Requirement" />
        <p className="text-sm leading-6 text-slate-600">
          Profiles are not considered booking-ready until weekly opening hours and daily appointment availability are configured.
        </p>
        <p className="mt-4 rounded-[8px] bg-soft-blue p-4 text-sm text-slate-600">
          Manage daily capacity and blocked slots under Availability. Parents only see slots that remain open after
          bookings and blocks are applied.
        </p>
      </Card>
    </div>
  );
}
