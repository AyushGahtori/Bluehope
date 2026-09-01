"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Inbox, Mail, Star } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import {
  authedApiHeaders,
  isConfigurationPendingResponse,
  isDemoSession,
  apiHeaders,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Shared data-loading contract for dashboard sections:
 * - loading: records are still being fetched
 * - empty: the account genuinely has zero records (never shown as an error)
 * - error: a real failure occurred
 * - demo: an explicit demo/guest session, served from the demo dataset
 */
type LoadState = "loading" | "ready" | "error";

function useAccountData<T>(
  endpoint: string,
  pick: (data: Record<string, unknown>) => T[],
) {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<T[]>([]);
  const [demo, setDemo] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        // Demo/guest sessions explicitly use the demo dataset; authenticated
        // accounts always use their own verified, account-scoped data.
        const headers = isDemoSession()
          ? await apiHeaders()
          : await authedApiHeaders();
        if (ignore) return;

        if (!headers) {
          setItems([]);
          setDemo(false);
          setState("ready");
          return;
        }

        const response = await fetch(endpoint, { headers, cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (ignore) return;

        if (!response.ok) {
          // Backend persistence not configured in this environment: treat as
          // a healthy empty state rather than a technical error.
          if (isConfigurationPendingResponse(response.status, body)) {
            setItems([]);
            setDemo(false);
            setState("ready");
            return;
          }
          setState("error");
          return;
        }

        setItems(pick((body ?? {}) as Record<string, unknown>));
        setDemo(isDemoSession());
        setState("ready");
      } catch {
        if (!ignore) setState("error");
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, reloadKey]);

  return {
    state,
    items,
    demo,
    reload: () => setReloadKey((key) => key + 1),
  };
}

function SectionShell({
  title,
  viewAllHref,
  icon,
  children,
}: {
  title: string;
  viewAllHref: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          {icon}
          {title}
        </h3>
        <Link
          href={viewAllHref}
          className="bluehope-lift rounded-md px-2 py-1 text-sm font-semibold text-bluehope hover:bg-blue-50"
        >
          View all
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-[8px] bg-slate-50 px-4 py-8 text-center">
      <p className="font-semibold text-slate-800">{message}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[8px] bg-rose-50 px-4 py-6 text-center">
      <p className="font-semibold text-rose-700">
        {"We couldn't load this right now. Please try again."}
      </p>
      <Button variant="outline" className="mt-3 h-9 px-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-14 animate-pulse rounded-[8px] bg-slate-100"
        />
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<
  string,
  { label: string; tone: "green" | "amber" | "blue" | "neutral" }
> = {
  new: { label: "New", tone: "amber" },
  open: { label: "New", tone: "amber" },
  responded: { label: "Responded", tone: "blue" },
  in_progress: { label: "In progress", tone: "blue" },
  closed: { label: "Closed", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "green" },
  requested: { label: "Requested", tone: "amber" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

type EnquiryItem = {
  id: string;
  parentName?: string;
  listingName?: string;
  message?: string;
  status?: string;
  createdAt?: unknown;
};

export function RecentEnquiriesCard({
  viewAllHref,
  demoEnquiries,
}: {
  viewAllHref: string;
  demoEnquiries: EnquiryItem[];
}) {
  const { state, items, demo, reload } = useAccountData<EnquiryItem>(
    "/api/enquiries",
    (data) =>
      Array.isArray(data.enquiries) ? (data.enquiries as EnquiryItem[]) : [],
  );

  return (
    <SectionShell
      title="Recent Enquiries"
      viewAllHref={viewAllHref}
      icon={<Mail className="h-5 w-5 text-bluehope" />}
    >
      {state === "loading" ? (
        <LoadingRows />
      ) : state === "error" ? (
        <ErrorState onRetry={reload} />
      ) : demo && items.length === 0 && demoEnquiries.length > 0 ? (
        <ul className="space-y-3">
          {demoEnquiries.slice(0, 3).map((enquiry) => (
            <li
              key={enquiry.id}
              className="bluehope-lift flex items-center justify-between rounded-[8px] bg-slate-50 px-4 py-3 hover:bg-blue-50"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {enquiry.parentName}
                </p>
                <p className="line-clamp-1 text-sm text-slate-500">
                  {enquiry.message}
                </p>
              </div>
              <Badge tone="amber">Demo</Badge>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState
          message="You don't have any enquiries yet."
          hint="When a family contacts you through your profile, their enquiry appears here."
        />
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 3).map((enquiry) => {
            const tone = STATUS_LABELS[enquiry.status ?? ""]?.tone ?? "neutral";
            const label =
              STATUS_LABELS[enquiry.status ?? ""]?.label ?? enquiry.status;
            return (
              <li
                key={enquiry.id}
                className="bluehope-lift flex items-center justify-between rounded-[8px] bg-slate-50 px-4 py-3 hover:bg-blue-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {enquiry.parentName ?? "Family"}
                  </p>
                  <p className="line-clamp-1 text-sm text-slate-500">
                    {enquiry.message}
                  </p>
                </div>
                <Badge tone={tone}>{label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}

type AppointmentItem = {
  id: string;
  date: string;
  time: string;
  serviceId: string;
  status: string;
};

function formatAppointmentDate(date: string) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function UpcomingAppointmentsCard({
  viewAllHref,
  demoAppointments,
}: {
  viewAllHref: string;
  demoAppointments: AppointmentItem[];
}) {
  const { state, items, demo, reload } = useAccountData<AppointmentItem>(
    "/api/appointments",
    (data) =>
      Array.isArray(data.appointments)
        ? (data.appointments as AppointmentItem[])
        : [],
  );

  // Demo/development environments merge the demo appointment dataset with the
  // authenticated account's real Firestore appointments (deduped, sorted).
  // Production builds show only real account data.
  const includeDemoData =
    isDemoSession() || process.env.NODE_ENV !== "production";

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const merged: Array<AppointmentItem & { isDemo?: boolean }> = [];
  if (includeDemoData) {
    for (const appointment of demoAppointments) {
      if (seen.has(appointment.id)) continue;
      seen.add(appointment.id);
      merged.push({ ...appointment, isDemo: true });
    }
  }
  for (const appointment of items) {
    if (seen.has(appointment.id)) continue;
    seen.add(appointment.id);
    merged.push(appointment);
  }

  const upcoming = merged
    .filter((item) => !item.date || item.date >= today)
    .filter((item) => item.status !== "cancelled")
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.time || "").localeCompare(b.time || ""),
    );

  return (
    <SectionShell
      title="Upcoming Appointments"
      viewAllHref={viewAllHref}
      icon={<CalendarCheck className="h-5 w-5 text-bluehope" />}
    >
      {state === "loading" ? (
        <LoadingRows />
      ) : state === "error" ? (
        <ErrorState onRetry={reload} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          message="You don't have any upcoming appointments."
          hint="Appointments booked by families will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {upcoming.slice(0, 2).map((appointment) => {
            const tone = STATUS_LABELS[appointment.status]?.tone ?? "neutral";
            const label =
              STATUS_LABELS[appointment.status]?.label ?? appointment.status;
            const [month, day] = (
              formatAppointmentDate(appointment.date) ?? ""
            ).split(" ");
            return (
              <li
                key={appointment.id}
                className="bluehope-lift flex items-center gap-4 rounded-[8px] bg-slate-50 px-4 py-3 hover:bg-blue-50"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[8px] bg-white text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {month}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {day}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {appointment.serviceId}
                  </p>
                  <p className="text-sm text-slate-500">{appointment.time}</p>
                </div>
                {appointment.isDemo ? (
                  <Badge tone="green" className={cn("ml-auto")}>
                    Demo
                  </Badge>
                ) : (
                  <Badge tone={tone} className={cn("ml-auto")}>
                    {label}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}

export function ReviewsSummaryCard({
  viewAllHref,
  ratingAverage,
  ratingTotal,
}: {
  viewAllHref: string;
  ratingAverage?: number;
  ratingTotal?: number;
}) {
  return (
    <SectionShell
      title="Reviews"
      viewAllHref={viewAllHref}
      icon={<Star className="h-5 w-5 text-bluehope" />}
    >
      {typeof ratingAverage === "number" && ratingTotal ? (
        <div className="bluehope-lift rounded-[8px] bg-slate-50 px-4 py-6 text-center hover:bg-blue-50">
          <p className="text-3xl font-extrabold text-slate-950">
            ★ {ratingAverage.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {ratingTotal} {ratingTotal === 1 ? "review" : "reviews"} from
            families
          </p>
        </div>
      ) : (
        <EmptyState
          message="You don't have any reviews yet."
          hint="Reviews from families will appear here after they share their experience."
        />
      )}
    </SectionShell>
  );
}

export function DashboardDataHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bluehope-lift flex items-start gap-3 rounded-[8px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
      <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-bluehope" />
      <p>{children}</p>
    </div>
  );
}
