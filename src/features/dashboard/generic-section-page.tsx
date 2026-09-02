import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/primitives";
import { ProviderAvailabilityManager } from "@/features/dashboard/provider-availability-manager";
import {
  ProviderAppointmentsSection,
  ProviderEnquiriesSection,
  ProviderMessagesSection,
  ProviderReviewsSection,
} from "@/features/dashboard/provider-inbox-sections";
import {
  EditProfileSection,
  QaSection,
  VerifyPlaceholder,
} from "@/features/dashboard/provider-profile-sections";
import {
  MyProfileSection,
} from "@/features/dashboard/provider-profile-view-section";

const providerNav = [
  "Dashboard",
  "My Profile",
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

export function GenericDashboardSectionPage({
  section,
  role,
}: {
  section: string;
  role: "provider" | "institution" | "admin";
}) {
  const nav = role === "provider" ? providerNav : role === "institution" ? instituteNav : adminNav;
  const roleLabel =
    role === "provider" ? "Dr. Priya Sharma" : role === "institution" ? "Institute User" : "Admin User";
  const homeHref =
    role === "provider"
      ? "/dashboard/provider"
      : role === "institution"
        ? "/dashboard/institute"
        : "/dashboard/admin";
  const editHref = role === "institution" ? "/dashboard/institute/edit-profile" : "/dashboard/provider/edit-profile";

  if (role !== "admin" && section === "explore") {
    notFound();
  }

  const providerSections: Record<string, React.ReactNode> = {
    availability: <ProviderAvailabilityManager />,
    messages: <ProviderMessagesSection />,
    enquiries: <ProviderEnquiriesSection />,
    appointments: <ProviderAppointmentsSection />,
    reviews: <ProviderReviewsSection />,
    qa: <QaSection />,
    "edit-profile": <EditProfileSection ownerType={role === "institution" ? "institution" : "provider"} />,
    verify: <VerifyPlaceholder />,
    profile: <MyProfileSection role={role === "institution" ? "institution" : "provider"} editHref={editHref} />,
  };

  const content = providerSections[section] ?? (
    // Unknown section: a clean user-facing page — never developer notes.
    <Card className="p-8 text-center">
      <h1 className="text-2xl font-extrabold text-slate-950">This section is coming soon</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        We are still building this part of BlueHope. Everything else in your dashboard keeps
        working as usual.
      </p>
      <Link
        href={homeHref}
        className="mt-5 inline-block rounded-[8px] bg-bluehope px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
      >
        Back to dashboard
      </Link>
    </Card>
  );

  return (
    <DashboardShell nav={nav} roleLabel={roleLabel} role={role}>
      {content}
    </DashboardShell>
  );
}
