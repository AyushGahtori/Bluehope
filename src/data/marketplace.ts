import type { ProviderSummary } from "@/types/domain";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TimeWindow = {
  start: string;
  end: string;
};

export type OpeningDay = {
  open: boolean;
  windows: TimeWindow[];
};

export type WeeklySchedule = Record<DayKey, OpeningDay>;

export type DateOverride = {
  closed?: boolean;
  windows?: TimeWindow[];
  capacity?: number;
  blockedSlots?: string[];
};

export type AppointmentSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
  status: "available" | "booked" | "blocked";
};

export type Review = {
  id: string;
  listingSlug: string;
  authorName: string;
  rating: number;
  date: string;
  text: string;
  images: string[];
  helpfulCount: number;
  providerReply?: {
    authorName: string;
    text: string;
    date: string;
  };
  moderationStatus: "approved" | "pending" | "flagged";
  verifiedInteraction: boolean;
};

export type ProfileQa = {
  question: string;
  answer: string;
};

export const defaultWeeklySchedule: WeeklySchedule = {
  mon: { open: true, windows: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }] },
  tue: { open: true, windows: [{ start: "09:00", end: "18:00" }] },
  wed: { open: false, windows: [] },
  thu: { open: true, windows: [{ start: "10:00", end: "17:00" }] },
  fri: { open: true, windows: [{ start: "09:00", end: "18:00" }] },
  sat: { open: true, windows: [{ start: "10:00", end: "14:00" }] },
  sun: { open: false, windows: [] },
};

export const defaultDateOverrides: Record<string, DateOverride> = {
  "2026-09-22": {
    capacity: 4,
    blockedSlots: ["14:00"],
  },
};

export const demoReviews: Review[] = [
  {
    id: "review-1",
    listingSlug: "bright-steps-speech-therapy-center",
    authorName: "Neha I.",
    rating: 5,
    date: "Aug 12, 2026",
    text: "The team explained every step clearly and gave us activities we could continue at home. It felt calm and practical.",
    images: [],
    helpfulCount: 18,
    providerReply: {
      authorName: "Bright Steps Speech Therapy Center",
      text: "Thank you for trusting us. Parent practice between sessions makes a real difference.",
      date: "Aug 13, 2026",
    },
    moderationStatus: "approved",
    verifiedInteraction: true,
  },
  {
    id: "review-2",
    listingSlug: "bright-steps-speech-therapy-center",
    authorName: "Rahul M.",
    rating: 4,
    date: "Jul 28, 2026",
    text: "Good structured sessions and very child-friendly. Scheduling was easy once slots were available.",
    images: [],
    helpfulCount: 9,
    moderationStatus: "approved",
    verifiedInteraction: true,
  },
  {
    id: "review-3",
    listingSlug: "wellvoice-speech-therapy",
    authorName: "Simran K.",
    rating: 5,
    date: "Aug 4, 2026",
    text: "We liked the online parent coaching and weekly progress notes. Very helpful for speech practice.",
    images: [],
    helpfulCount: 12,
    moderationStatus: "approved",
    verifiedInteraction: true,
  },
];

export const demoProfileQas: ProfileQa[] = [
  {
    question: "How involved are parents in therapy?",
    answer: "Parents receive simple home-practice guidance after sessions so progress continues outside the clinic.",
  },
  {
    question: "Do you offer online sessions?",
    answer: "Online sessions are available for parent coaching and selected therapy plans when clinically appropriate.",
  },
  {
    question: "What age groups do you work with?",
    answer: "Most plans support children from early intervention through teenage years, depending on the service.",
  },
];

const dayOrder: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayLabels: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function fromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${period}`;
}

export function dayKeyForDate(dateValue: string): DayKey {
  const date = new Date(`${dateValue}T00:00:00`);
  return dayOrder[date.getDay()];
}

export function getOpeningForDate(dateValue: string, schedule = defaultWeeklySchedule, overrides = defaultDateOverrides) {
  const dayKey = dayKeyForDate(dateValue);
  const base = schedule[dayKey];
  const override = overrides[dateValue];
  const open = override?.closed ? false : base.open;
  const windows = override?.windows ?? base.windows;

  return {
    dayKey,
    dayLabel: dayLabels[dayKey],
    open,
    windows: open ? windows : [],
    capacity: override?.capacity ?? 8,
    blockedSlots: override?.blockedSlots ?? [],
  };
}

export function generateSlotsForDate(
  dateValue: string,
  bookedSlotIds: string[] = [],
  schedule = defaultWeeklySchedule,
  overrides = defaultDateOverrides,
): AppointmentSlot[] {
  const opening = getOpeningForDate(dateValue, schedule, overrides);
  if (!opening.open) return [];

  const slots = opening.windows.flatMap((window) => {
    const result: AppointmentSlot[] = [];
    for (let current = minutes(window.start); current + 60 <= minutes(window.end); current += 60) {
      const start = fromMinutes(current);
      const end = fromMinutes(current + 60);
      const status = bookedSlotIds.includes(start)
        ? "booked"
        : opening.blockedSlots.includes(start)
          ? "blocked"
          : "available";
      result.push({
        id: start,
        start,
        end,
        label: `${formatTime(start)} - ${formatTime(end)}`,
        status,
      });
    }
    return result;
  });

  const bookedOrBlocked = slots.filter((slot) => slot.status !== "available").length;
  if (bookedOrBlocked >= opening.capacity) {
    return slots.map((slot) => (slot.status === "available" ? { ...slot, status: "blocked" } : slot));
  }

  return slots;
}

export function openingSummary(dateValue: string) {
  const opening = getOpeningForDate(dateValue);
  if (!opening.open || opening.windows.length === 0) return "Closed today";
  return `Open today: ${opening.windows.map((window) => `${formatTime(window.start)} - ${formatTime(window.end)}`).join(", ")}`;
}

export function reviewsForProfile(profile: ProviderSummary) {
  const ownReviews = demoReviews.filter((review) => review.listingSlug === profile.slug);
  if (ownReviews.length > 0) return ownReviews;

  return [
    {
      ...demoReviews[0],
      id: `${profile.slug}-review-1`,
      listingSlug: profile.slug,
      authorName: "BlueHope Parent",
      text: `${profile.name} has a helpful profile setup. Reviews here are demo records until verified interactions are connected.`,
    },
  ];
}

export function ratingDistribution(reviews: Review[]) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  reviews.forEach((review) => {
    counts[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
  });
  return counts;
}
