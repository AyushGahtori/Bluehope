"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Input, SectionTitle } from "@/components/ui/primitives";
import {
  defaultWeeklySchedule,
  formatTime,
  type AppointmentSlot,
} from "@/data/marketplace";
import { cn } from "@/lib/utils";

const DEMO_HEADERS = { "x-bluehope-demo": "true" } as const;
const MANAGED_LISTING_SLUG = "bright-steps-speech-therapy-center";

type AvailabilityPayload = {
  listingSlug: string;
  date: string;
  capacity: number;
  confirmedCount: number;
  remainingCapacity: number;
  fullyBooked: boolean;
  slots: AppointmentSlot[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ProviderAvailabilityManager() {
  const [date, setDate] = useState(todayIso());
  const [capacityDraft, setCapacityDraft] = useState("8");
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = useCallback((targetDate: string) => {
    return fetch(`/api/availability?listingSlug=${MANAGED_LISTING_SLUG}&date=${targetDate}`, {
      headers: DEMO_HEADERS,
    })
      .then((response) => {
        if (!response.ok) throw new Error("request_failed");
        return response.json() as Promise<{ availability?: AvailabilityPayload }>;
      })
      .then((data) => {
        setAvailability(data.availability ?? null);
        setCapacityDraft(String(data.availability?.capacity ?? 8));
        setError("");
      })
      .catch(() => {
        setAvailability(null);
        setError("We couldn't load availability for this date. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAvailability(date);
  }, [date, loadAvailability]);

  const saveOverride = async (
    patch: { capacity?: number; blockedSlots?: string[] },
    optimistic?: AvailabilityPayload,
  ) => {
    if (optimistic) setAvailability(optimistic);
    setSaving(true);
    try {
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...DEMO_HEADERS },
        body: JSON.stringify({ listingSlug: MANAGED_LISTING_SLUG, date, ...patch }),
      });
      if (!response.ok) throw new Error("request_failed");
      const data = (await response.json()) as { availability?: AvailabilityPayload };
      setAvailability(data.availability ?? null);
      setCapacityDraft(String(data.availability?.capacity ?? patch.capacity ?? 8));
      setError("");
    } catch {
      setError("We couldn't save that change. Please try again.");
      loadAvailability(date);
    } finally {
      setSaving(false);
    }
  };

  const applyCapacity = () => {
    const parsed = Number(capacityDraft);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 24) {
      setError("Capacity must be a whole number between 1 and 24.");
      return;
    }
    void saveOverride({ capacity: parsed });
  };

  const toggleBlock = (slotId: string) => {
    if (!availability) return;
    const current = availability.slots
      .filter((slot) => slot.status === "blocked")
      .map((slot) => slot.id);
    const next = current.includes(slotId)
      ? current.filter((id) => id !== slotId)
      : [...current, slotId];

    const optimistic: AvailabilityPayload = {
      ...availability,
      slots: availability.slots.map((slot) =>
        slot.id === slotId && slot.status !== "booked"
          ? { ...slot, status: current.includes(slotId) ? ("available" as const) : ("blocked" as const) }
          : slot,
      ),
    };
    void saveOverride({ blockedSlots: next }, optimistic);
  };

  const opening = defaultWeeklySchedule[
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(`${date}T00:00:00`).getDay()] as keyof typeof defaultWeeklySchedule
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-6">
        <SectionTitle title="Weekly Opening Hours" eyebrow="Reusable schedule" />
        <div className="space-y-3">
          {Object.entries(defaultWeeklySchedule).map(([day, config]) => (
            <div key={day} className="flex items-center justify-between rounded-[8px] border border-slate-100 p-3">
              <div>
                <p className="font-bold capitalize text-slate-950">{day}</p>
                <p className="text-sm text-slate-500">
                  {config.open
                    ? config.windows.map((window) => `${formatTime(window.start)} - ${formatTime(window.end)}`).join(", ")
                    : "Closed"}
                </p>
              </div>
              <Badge tone={config.open ? "green" : "neutral"}>{config.open ? "Open" : "Closed"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="Daily Availability" eyebrow="Saved per date · parents see these slots" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-sm font-semibold">Select date</span>
            <Input
              className="mt-2"
              type="date"
              value={date}
              onChange={(event) => {
                setLoading(true);
                setDate(event.target.value);
              }}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Maximum appointments</span>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                min={1}
                max={24}
                value={capacityDraft}
                onChange={(event) => setCapacityDraft(event.target.value)}
              />
              <Button variant="outline" onClick={applyCapacity} disabled={saving}>
                Save
              </Button>
            </div>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="mt-5 rounded-[8px] bg-soft-blue p-4">
          <p className="font-bold capitalize text-slate-950">
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {opening.open
              ? opening.windows.map((window) => `${formatTime(window.start)} - ${formatTime(window.end)}`).join(", ")
              : "Closed by weekly schedule"}
          </p>
          {availability ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={availability.remainingCapacity === 0 ? "amber" : "green"}>
                {availability.confirmedCount} / {availability.capacity} booked
              </Badge>
              <Badge tone="neutral">
                {availability.slots.filter((slot) => slot.status === "blocked").length} blocked
              </Badge>
              {availability.fullyBooked ? (
                <Badge tone="amber">Fully booked</Badge>
              ) : (
                <Badge tone="blue">{availability.remainingCapacity} remaining</Badge>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {loading ? (
            <>
              {[0, 1].map((index) => (
                <div key={index} className="h-28 animate-pulse rounded-[8px] bg-slate-100" />
              ))}
            </>
          ) : !availability || availability.slots.length === 0 ? (
            <p className="rounded-[8px] border border-slate-100 p-4 text-sm text-slate-500 sm:col-span-2">
              No appointment slots for this date. Weekly opening hours determine the generated slots.
            </p>
          ) : (
            availability.slots.map((slot) => {
              const blocked = slot.status === "blocked";
              const booked = slot.status === "booked";
              return (
                <div
                  key={slot.id}
                  className={cn(
                    "rounded-[8px] border p-4",
                    booked && "border-slate-200 bg-slate-100 text-slate-400",
                    blocked && "border-amber-200 bg-amber-50",
                    slot.status === "available" && "border-blue-100 bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{slot.label}</p>
                    <Badge tone={booked ? "neutral" : blocked ? "amber" : "green"}>
                      {booked ? "Booked" : blocked ? "Blocked" : "Available"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 h-9 w-full"
                    disabled={booked || saving}
                    onClick={() => toggleBlock(slot.id)}
                  >
                    {blocked ? "Unblock slot" : "Block slot"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
        {!loading && availability && availability.confirmedCount > 0 ? (
          <p className="mt-4 rounded-[8px] bg-slate-50 p-4 text-sm text-slate-600">
            {availability.confirmedCount} confirmed parent booking{availability.confirmedCount === 1 ? "" : "s"} for this
            date. Booked slots cannot be blocked or double-booked.
          </p>
        ) : null}
      </Card>
    </div>
  );
}