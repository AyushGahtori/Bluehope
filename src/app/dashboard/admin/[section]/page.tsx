import { GenericDashboardSectionPage } from "@/features/dashboard/generic-section-page";

export default async function AdminDashboardSectionPage({
  params,
}: PageProps<"/dashboard/admin/[section]">) {
  const { section } = await params;

  return <GenericDashboardSectionPage section={section} role="admin" />;
}
