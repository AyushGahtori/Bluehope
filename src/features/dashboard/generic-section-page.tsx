import { FileText } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, LinkButton, SectionTitle } from "@/components/ui/primitives";

const providerNav = [
  "Dashboard",
  "My Profile",
  "Services",
  "Appointments",
  "Enquiries",
  "Reviews & Ratings",
  "Messages",
  "Gallery",
  "Availability",
  "Profile Settings",
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

function titleFromSection(section: string) {
  return section
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function GenericDashboardSectionPage({
  section,
  role,
}: {
  section: string;
  role: "provider" | "admin";
}) {
  const title = titleFromSection(section);

  return (
    <DashboardShell
      nav={role === "provider" ? providerNav : adminNav}
      roleLabel={role === "provider" ? "Dr. Priya Sharma" : "Admin User"}
    >
      <div className="mb-6 flex items-center gap-4">
        <span className="rounded-[8px] bg-blue-50 p-4 text-bluehope">
          <FileText className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950">{title}</h1>
          <p className="mt-1 text-slate-600">Foundation workspace for this BlueHope section.</p>
        </div>
      </div>
      <Card className="p-6">
        <SectionTitle title={`${title} foundation`} />
        <p className="text-slate-600">
          This section is wired into navigation and ready for the next detailed implementation pass.
        </p>
        <LinkButton href={role === "provider" ? "/dashboard/provider" : "/dashboard/admin"} className="mt-5">
          Back to dashboard
        </LinkButton>
      </Card>
    </DashboardShell>
  );
}
