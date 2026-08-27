"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle2,
  Heart,
  MessageSquare,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BlueSelect,
  Button,
  Card,
  Input,
  LinkButton,
} from "@/components/ui/primitives";
import {
  generateSlotsForDate,
  getOpeningForDate,
  openingSummary,
  type AppointmentSlot,
} from "@/data/marketplace";
import type { ProviderSummary } from "@/types/domain";
import { apiHeaders, storedAuthUser } from "@/lib/api-client";
import { useSavedProvider } from "@/features/marketplace/save-provider-button";
import { cn } from "@/lib/utils";

type ActionMode = "contact" | "booking" | null;

type Confirmation =
  | { type: "contact"; providerName: string }
  | {
      type: "booking";
      providerName: string;
      service: string;
      childName: string;
      date: string;
      slotLabel: string;
    }
  | null;

const defaultDate = "2026-09-22";

export function ProfileActions({ profile }: { profile: ProviderSummary }) {
  const { saved, toggle: toggleSaved } = useSavedProvider(
    profile.slug,
    profile.name,
  );
  const [mode, setMode] = useState<ActionMode>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  if (confirmation) {
    return (
      <Card className="p-5">
        <div className="rounded-[12px] bg-emerald-50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-3 text-xl font-extrabold text-slate-950">
            {confirmation.type === "booking"
              ? "Appointment Confirmed"
              : "Request Sent"}
          </h2>
          {confirmation.type === "booking" ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-bold">{confirmation.providerName}</p>
              <p>{confirmation.service}</p>
              <p>{confirmation.date}</p>
              <p>{confirmation.slotLabel}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Your request has been sent to {confirmation.providerName}.
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          {confirmation.type === "booking" ? (
            <>
              <Button variant="outline" className="w-full">
                Add to calendar
              </Button>
              <LinkButton
                href="/dashboard/parent/appointments"
                variant="secondary"
                className="w-full"
              >
                View appointment
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton
                href="/dashboard/parent/messages"
                variant="secondary"
                className="w-full"
              >
                View messages
              </LinkButton>
              <LinkButton
                href="/dashboard/parent/enquiries"
                variant="outline"
                className="w-full"
              >
                View enquiries
              </LinkButton>
            </>
          )}
          <Button className="w-full" onClick={() => setConfirmation(null)}>
            Back to provider
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-5">
      <Button className="w-full" onClick={() => setMode("contact")}>
        <MessageSquare className="h-4 w-4" />
        Contact Now
      </Button>
      <Button
        variant={saved ? "secondary" : "outline"}
        className="w-full"
        onClick={() => void toggleSaved()}
      >
        <Heart className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
        {saved ? "Saved" : "Save Provider"}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setMode("booking")}
      >
        <CalendarCheck className="h-4 w-4" />
        Book Appointment
      </Button>

      <AnimatePresence>
        {mode === "contact" ? (
          <ContactPanel
            profile={profile}
            onClose={() => setMode(null)}
            onDone={() =>
              setConfirmation({ type: "contact", providerName: profile.name })
            }
          />
        ) : null}
        {mode === "booking" ? (
          <BookingPanel
            profile={profile}
            onClose={() => setMode(null)}
            onDone={(details) =>
              setConfirmation({
                type: "booking",
                providerName: profile.name,
                ...details,
              })
            }
          />
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-bold text-slate-950">{title}</p>
          <button
            onClick={onClose}
            aria-label="Close form"
            className="rounded-md p-1 hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function ContactPanel({
  profile,
  onClose,
  onDone,
}: {
  profile: ProviderSummary;
  onClose: () => void;
  onDone: () => void;
}) {
  const authUser = storedAuthUser();
  const [form, setForm] = useState({
    parentName: authUser?.name?.trim() || "Neha Sharma",
    phone: "+91 98765 43210",
    serviceId: profile.services[0] ?? "speech-therapy",
    childName: "Aarav Sharma",
    message:
      "I am looking for support and would like to understand your availability.",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError("");
    setSending(true);
    const headers = await apiHeaders();
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...form, listingSlug: profile.slug }),
    });
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setSending(false);

    if (!response.ok) {
      setError(
        data?.message ||
          "We couldn't send that request. Please check the details and try again.",
      );
      return;
    }

    onClose();
    onDone();
  };

  return (
    <PanelShell title="Contact request" onClose={onClose}>
      <div className="space-y-3">
        <Input
          value={form.parentName}
          onChange={(event) =>
            setForm({ ...form, parentName: event.target.value })
          }
          placeholder="Parent name"
        />
        <Input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="Phone number"
        />
        <BlueSelect
          value={form.serviceId}
          onChange={(serviceId) => setForm({ ...form, serviceId })}
          placeholder="Select service"
          options={profile.services.map((service) => ({
            value: service,
            label: service.replaceAll("-", " "),
          }))}
        />
        <Input
          value={form.childName}
          onChange={(event) =>
            setForm({ ...form, childName: event.target.value })
          }
          placeholder="Child context (optional)"
        />
        <textarea
          className="min-h-24 w-full rounded-[12px] border border-slate-300 bg-white p-4 text-sm outline-none focus:border-bluehope focus:ring-4 focus:ring-blue-100"
          value={form.message}
          onChange={(event) =>
            setForm({ ...form, message: event.target.value })
          }
          placeholder={`Message for ${profile.name}`}
        />
        {error ? (
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
        <Button className="w-full" onClick={submit} disabled={sending}>
          {sending ? "Sending..." : "Send Request"}
        </Button>
      </div>
    </PanelShell>
  );
}

function BookingPanel({
  profile,
  onClose,
  onDone,
}: {
  profile: ProviderSummary;
  onClose: () => void;
  onDone: (details: {
    service: string;
    childName: string;
    date: string;
    slotLabel: string;
  }) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [serviceId, setServiceId] = useState(
    profile.services[0] ?? "speech-therapy",
  );
  const [childName, setChildName] = useState("Aarav Sharma");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<AppointmentSlot[]>(
    generateSlotsForDate(defaultDate, []),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const opening = useMemo(() => getOpeningForDate(date), [date]);
  const selected = slots.find((slot) => slot.id === selectedSlot);

  useEffect(() => {
    let ignore = false;
    apiHeaders()
      .then((headers) =>
        fetch(`/api/bookings?listingSlug=${profile.slug}&date=${date}`, {
          headers,
        }),
      )
      .then((response) => response.json())
      .then((data) => {
        if (!ignore)
          setSlots(data.availability?.slots ?? generateSlotsForDate(date, []));
      })
      .catch(() => {
        if (!ignore) setSlots(generateSlotsForDate(date, []));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [date, profile.slug]);

  const submit = async () => {
    if (!selected) {
      setError("Please choose an available time slot.");
      return;
    }

    setError("");
    setLoading(true);
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: await apiHeaders(),
      body: JSON.stringify({
        listingSlug: profile.slug,
        parentName: storedAuthUser()?.name?.trim() || "Parent",
        childName,
        serviceId,
        date,
        slotId: selected.id,
      }),
    });
    setLoading(false);

    if (!response.ok) {
      const refreshed = await fetch(
        `/api/bookings?listingSlug=${profile.slug}&date=${date}`,
        {
          headers: await apiHeaders(),
        },
      )
        .then((item) => item.json())
        .catch(() => null);
      setSlots(refreshed?.availability?.slots ?? slots);
      setError(
        "That appointment slot is no longer available. Please choose another time.",
      );
      return;
    }

    onClose();
    onDone({
      service: serviceId.replaceAll("-", " "),
      childName,
      date,
      slotLabel: selected.label,
    });
  };

  return (
    <PanelShell title="Book an appointment" onClose={onClose}>
      <div className="space-y-3">
        <Input
          value={childName}
          onChange={(event) => setChildName(event.target.value)}
          placeholder="Select child"
        />
        <BlueSelect
          value={serviceId}
          onChange={setServiceId}
          placeholder="Select service"
          options={profile.services.map((service) => ({
            value: service,
            label: service.replaceAll("-", " "),
          }))}
        />
        <Input
          type="date"
          value={date}
          onChange={(event) => {
            setLoading(true);
            setDate(event.target.value);
            setSelectedSlot("");
          }}
        />
        <div className="rounded-[10px] bg-white p-3 text-sm">
          <p
            className={
              opening.open
                ? "font-bold text-emerald-700"
                : "font-bold text-slate-500"
            }
          >
            {opening.open ? openingSummary(date) : "Closed for this date"}
          </p>
          <p className="mt-1 text-slate-500">
            Daily capacity: 8 appointments. Booked slots become unavailable
            immediately.
          </p>
        </div>
        <div className="grid gap-2">
          {loading ? (
            <p className="rounded-[10px] bg-white p-3 text-sm text-slate-500">
              Checking availability...
            </p>
          ) : null}
          {!loading && slots.length === 0 ? (
            <p className="rounded-[10px] bg-white p-3 text-sm text-slate-500">
              This provider hasn&apos;t opened appointment slots for this date.
            </p>
          ) : null}
          {slots.map((slot) => {
            const disabled = slot.status !== "available";
            return (
              <button
                key={slot.id}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedSlot(slot.id)}
                className={cn(
                  "flex items-center justify-between rounded-[10px] border bg-white px-3 py-3 text-left text-sm font-semibold transition",
                  selectedSlot === slot.id &&
                    "border-bluehope bg-blue-50 text-bluehope",
                  disabled &&
                    "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
                  !disabled && "border-slate-200 hover:border-bluehope",
                )}
              >
                <span>{slot.label}</span>
                <span>
                  {slot.status === "available"
                    ? "Available"
                    : slot.status === "booked"
                      ? "Booked"
                      : "Unavailable"}
                </span>
              </button>
            );
          })}
        </div>
        {error ? (
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
        <Button
          className="w-full"
          onClick={submit}
          disabled={loading || !selected}
        >
          Confirm Booking
        </Button>
      </div>
    </PanelShell>
  );
}
