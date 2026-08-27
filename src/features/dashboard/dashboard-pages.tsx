"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  PlusCircle,
  Star,
  Users,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  Badge,
  Card,
  LinkButton,
  SectionTitle,
} from "@/components/ui/primitives";
import { demoAppointments, demoEnquiries } from "@/data/demo";
import { CommunityPreferences } from "@/features/dashboard/community-preferences";
import { UserGreeting } from "@/features/dashboard/user-greeting";
import {
  RecentEnquiriesCard,
  ReviewsSummaryCard,
  UpcomingAppointmentsCard,
} from "@/features/dashboard/dashboard-data-cards";
import {
  EmptyProfileState,
  ProfilePreview,
} from "@/features/dashboard/profile-preview";
import {
  authedApiHeaders,
  isConfigurationPendingResponse,
} from "@/lib/api-client";
import { useStoredAuthUser } from "@/lib/auth-user-store";
import { cn } from "@/lib/utils";

const parentNav = [
  "Dashboard",
  "Search",
  "Saved Providers",
  "My Enquiries",
  "Appointments",
  "Messages",
  "Notifications",
  "Resources",
  "My Children",
  "Profile Settings",
];

const providerNav = [
  "Dashboard",
  "My Profile",
  "Explore",
  "Inquiries",
  "Appointments",
  "Reviews & Ratings",
  "Messages",
  "Q&A",
  "Edit Profile",
  "Verify",
];

const instituteNav = [
  "Dashboard",
  "My Profile",
  "Explore",
  "Inquiries",
  "Appointments",
  "Reviews & Ratings",
  "Messages",
  "Q&A",
  "Edit Profile",
  "Verify",
];

const adminNav = [
  "Dashboard",
  "Users",
  "Providers",
  "Services & Categories",
  "Enquiries",
  "Appointments",
  "Reviews & Ratings",
  "Messages",
  "Reports",
  "Settings",
];

type ProfileData = {
  name: string;
  tagline: string;
  bio: string;
  images: string[];
  services: string[];
  conditions: string[];
  weeklyHours: Record<string, { open: string; close: string } | null>;
  location: { text: string; source: string | null } | null;
  profileCompleteness: number;
  missingItems: string[];
};

/**
 * Loads the signed-in provider/institute's OWN profile (ownerUid-scoped,
 * resolved from the verified Firebase ID token server-side). Never reads
 * another account's data and never falls back to demo records.
 */
function useOwnProfile() {
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    let ignore = false;

    authedApiHeaders().then((headers) => {
      if (ignore) return;
      if (!headers) {
        setProfile(null);
        setState("ready");
        return;
      }
      fetch("/api/provider-profile", { headers, cache: "no-store" })
        .then((response) => response.json().catch(() => null))
        .then((body: unknown) => {
          if (ignore) return;
          if (body && typeof body === "object") {
            const data = body as { profile?: ProfileData | null };
            setProfile(data.profile ?? null);
          } else {
            setProfile(null);
          }
          setState("ready");
        })
        .catch(() => {
          if (ignore) return;
          setProfile(null);
          setState("ready");
        });
    });

    return () => {
      ignore = true;
    };
  }, []);

  return { state, profile };
}

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function todayHoursLabel(profile: ProfileData | null) {
  if (!profile) return undefined;
  const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
    new Date().getDay()
  ];
  const entry = profile.weeklyHours?.[dayKey];
  return entry
    ? `${DAY_LABELS[dayKey]} ${entry.open}–${entry.close}`
    : undefined;
}

/**
 * Shared provider/institute dashboard body. Every section is account-scoped:
 * the profile preview reflects the caller's own Firestore profile, and the
 * enquiry/appointment cards load the caller's own records. Demo data appears
 * only in explicit demo (guest) sessions.
 */
function ProviderDashboardBody({
  role,
  fallbackName,
  editHref,
  verifyHref,
  enquiriesHref,
  appointmentsHref,
  reviewsHref,
}: {
  role: "provider" | "institution";
  fallbackName: string;
  editHref: string;
  verifyHref: string;
  enquiriesHref: string;
  appointmentsHref: string;
  reviewsHref: string;
}) {
  const authUser = useStoredAuthUser();
  const { state, profile } = useOwnProfile();

  const complete = Boolean(profile && profile.profileCompleteness >= 100);
  const displayName = profile?.name || authUser?.name || fallbackName;

  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-950">Your Profile</h1>
      <p className="mt-2 text-slate-600">
        This is how families see{" "}
        {role === "institution" ? "your organization" : "you"} on BlueHope. Keep
        it complete and current.
      </p>
      <div className="mt-6 space-y-6">
        {state === "loading" ? (
          <div
            className="h-72 animate-pulse rounded-[8px] bg-slate-100"
            aria-busy="true"
          />
        ) : complete && profile ? (
          <ProfilePreview
            data={{
              name: displayName,
              tagline:
                profile.tagline ||
                (role === "institution"
                  ? "Child development center"
                  : "Independent provider"),
              bio: profile.bio || undefined,
              images: profile.images,
              services: profile.services,
              conditions: profile.conditions,
              openingHoursToday: todayHoursLabel(profile),
              location: profile.location?.text || undefined,
              verificationStatus: "notRequested",
              completionPercent: profile.profileCompleteness,
              missingItems: [],
              editHref,
            }}
          />
        ) : (
          <EmptyProfileState
            title="Your profile is not complete yet"
            description={
              role === "institution"
                ? "Complete your profile so families can understand what your organization offers."
                : "Complete your profile so families can understand your expertise, services, and availability."
            }
            editHref={editHref}
          />
        )}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr_0.75fr]">
          <RecentEnquiriesCard
            viewAllHref={enquiriesHref}
            demoEnquiries={demoEnquiries}
          />
          <UpcomingAppointmentsCard
            viewAllHref={appointmentsHref}
            demoAppointments={demoAppointments.map((appointment, index) => ({
              id: `demo-appointment-${index}`,
              date: "",
              time: appointment.time,
              serviceId: appointment.service,
              status: "confirmed",
            }))}
          />
          <ProfileStatus
            missingItems={profile?.missingItems ?? []}
            verifyHref={verifyHref}
          />
        </div>
        <ReviewsSummaryCard viewAllHref={reviewsHref} />
      </div>
    </>
  );
}

export function ProviderDashboard() {
  return (
    <DashboardShell
      nav={providerNav}
      roleLabel="Dr. Priya Sharma"
      role="provider"
    >
      <ProviderDashboardBody
        role="provider"
        fallbackName="Your Practice"
        editHref="/dashboard/provider/edit-profile"
        verifyHref="/dashboard/provider/verify"
        enquiriesHref="/dashboard/provider/enquiries"
        appointmentsHref="/dashboard/provider/appointments"
        reviewsHref="/dashboard/provider/reviews"
      />
    </DashboardShell>
  );
}

export function InstituteDashboard() {
  return (
    <DashboardShell
      nav={instituteNav}
      roleLabel="Institute User"
      role="institution"
    >
      <ProviderDashboardBody
        role="institution"
        fallbackName="Your Organization"
        editHref="/dashboard/institute/edit-profile"
        verifyHref="/dashboard/institute/verify"
        enquiriesHref="/dashboard/institute/enquiries"
        appointmentsHref="/dashboard/institute/appointments"
        reviewsHref="/dashboard/institute/reviews"
      />
    </DashboardShell>
  );
}

export function ParentDashboard() {
  return (
    <DashboardShell nav={parentNav} roleLabel="Hi, Neha" role="parent">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card className="bg-soft-blue p-8">
          <UserGreeting fallback="Welcome back!" />
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            We are here to help you find the right support for your child and
            their unique needs.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[8px] bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">
                Active child context
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                Aarav · Speech support
              </p>
            </div>
            <div className="rounded-[8px] bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">
                Recommended next step
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                Compare 6 nearby therapists
              </p>
            </div>
            <div className="rounded-[8px] bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">
                Marketplace loop
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                Contact · Book · Review
              </p>
            </div>
          </div>
          <LinkButton
            href="/dashboard/parent/search"
            className="mt-6"
            variant="outline"
          >
            Search support
          </LinkButton>
        </Card>
        <Card className="p-6">
          <SectionTitle
            title="Your Children"
            action={
              <LinkButton href="#" variant="ghost">
                View all
              </LinkButton>
            }
          />
          <div className="flex items-center gap-4 rounded-[8px] border border-slate-200 p-4">
            <span className="h-16 w-16 rounded-full bg-slate-200" />
            <div>
              <p className="font-bold">Aarav Sharma</p>
              <p className="text-sm text-slate-600">8 years old</p>
              <p className="text-sm text-slate-600">Autism (ASD)</p>
            </div>
          </div>
        </Card>
      </div>
      <QuickAccess />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <UpcomingAppointmentsCard
          viewAllHref="/dashboard/parent/appointments"
          demoAppointments={demoAppointments.map((appointment, index) => ({
            id: `demo-appointment-${index}`,
            date: "",
            time: appointment.time,
            serviceId: appointment.service,
            status: "confirmed",
          }))}
        />
        <Card className="p-6">
          <SectionTitle
            title="Parent Community"
            action={<Badge tone="neutral">Optional</Badge>}
          />
          <div className="rounded-[8px] bg-soft-blue p-5">
            <p className="text-lg font-bold text-bluehope">
              Connect with parents who understand a similar journey.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Community matching is a future moderated feature. These
              preferences only tell BlueHope what you would like to hear about
              when it is ready.
            </p>
          </div>
          <CommunityPreferences />
        </Card>
      </div>
    </DashboardShell>
  );
}

export function AdminDashboard() {
  return (
    <DashboardShell nav={adminNav} roleLabel="Admin User" role="admin">
      <h1 className="text-3xl font-extrabold text-slate-950">
        Welcome back, Admin!
      </h1>
      <p className="mt-2 text-slate-600">
        Here is what is happening across BlueHope.
      </p>
      <MetricGrid
        items={[
          ["Total Users", "2568", Users],
          ["Total Providers", "842", CheckCircle2],
          ["Total Enquires", "3675", HeartPulse],
          ["Total Reviews", "1926", Star],
          ["Total Page Views", "22,448", Eye],
        ]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr_0.65fr]">
        <Card className="p-6">
          <SectionTitle
            title="Enquiries Overview"
            action={<Badge tone="neutral">Last 7 days</Badge>}
          />
          <div className="h-72 rounded-[8px] bg-[linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[length:100%_48px]" />
        </Card>
        <AdminEnquiryCard />
        <Card className="p-6">
          <SectionTitle
            title="User registration"
            action={
              <LinkButton href="#" variant="ghost">
                View all
              </LinkButton>
            }
          />
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[18px] border-bluehope text-center">
            <span>
              <b>2568</b>
              <br />
              Total Users
            </span>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

function QuickAccess() {
  return (
    <section className="mt-7">
      <SectionTitle
        title="Quick Access"
        action={
          <LinkButton href="/dashboard/parent/search" variant="ghost">
            View all categories
          </LinkButton>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Therapist",
            "Find services and providers",
            "bg-blue-50 text-bluehope",
            "/dashboard/parent/search?service=speech-therapy&radius=20",
          ],
          [
            "Near Me",
            "Find services and providers",
            "bg-emerald-50 text-emerald-600",
            "/dashboard/parent/search?radius=10",
          ],
          [
            "School",
            "Find services and providers",
            "bg-rose-50 text-rose-500",
            "/dashboard/parent/search?service=special-education&radius=20",
          ],
          [
            "Doctor",
            "Find services and providers",
            "bg-amber-50 text-amber-600",
            "/dashboard/parent/search?service=psychological-services&radius=20",
          ],
        ].map(([title, text, tone, href]) => (
          <Link
            key={title}
            href={href}
            className="block transition hover:-translate-y-0.5"
          >
            <Card className="flex items-center gap-5 p-6">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-[8px] ${tone}`}
              >
                <PlusCircle className="h-9 w-9" />
              </span>
              <div>
                <p className="text-xl font-bold">{title}</p>
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MetricGrid({
  items,
}: {
  items: Array<[string, string, typeof Users]>;
}) {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      {items.map(([label, value, Icon], index) => (
        <Card key={label} className="flex items-center gap-5 bg-slate-50 p-6">
          <span
            className={
              index % 2
                ? "rounded-full bg-emerald-100 p-4 text-emerald-600"
                : "rounded-full bg-blue-100 p-4 text-bluehope"
            }
          >
            <Icon className="h-8 w-8" />
          </span>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-3xl font-extrabold">{value}</p>
            <p className="mt-2 text-sm text-emerald-600">+18% this month</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Admin-only overview card (mock console data, not user-facing dashboards). */
function AdminEnquiryCard() {
  return (
    <Card className="p-6">
      <SectionTitle
        title="Recent Enquiries"
        action={
          <LinkButton href="/dashboard/admin/enquiries" variant="ghost">
            View all
          </LinkButton>
        }
      />
      {demoEnquiries.map((enquiry, index) => (
        <div
          key={enquiry.id}
          className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0"
        >
          <div className="flex items-center gap-4">
            <span className="h-12 w-12 rounded-full bg-purple-100" />
            <div>
              <p className="font-bold">{enquiry.parentName}</p>
              <p className="text-sm text-slate-600">{enquiry.message}</p>
            </div>
          </div>
          <Badge tone={index === 0 ? "amber" : "green"}>
            {index === 0 ? "New" : "Requested"}
          </Badge>
        </div>
      ))}
    </Card>
  );
}

/**
 * Next-steps card derived from the account's real profile completion. The
 * incomplete-profile warning disappears once every required section is done,
 * while Edit Profile remains permanently available in the sidebar.
 */
function ProfileStatus({
  missingItems,
  verifyHref,
}: {
  missingItems: string[];
  verifyHref: string;
}) {
  return (
    <Card className="p-6">
      <SectionTitle
        title="Next Steps"
        action={<Badge tone="amber">Not Verified</Badge>}
      />
      <div className="space-y-3 text-sm text-slate-600">
        {missingItems.length === 0 ? (
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Your profile is complete. Keep it updated any time via Edit Profile.
          </p>
        ) : (
          <>
            {missingItems.map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-slate-300" />
                Add your {item.toLowerCase()}
              </p>
            ))}
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-slate-300" />
              Verification (coming next)
            </p>
          </>
        )}
      </div>
      <LinkButton
        href={verifyHref}
        variant="outline"
        className={cn("mt-6 w-full")}
      >
        Verification status
      </LinkButton>
    </Card>
  );
}
