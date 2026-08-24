import { GenericDashboardSectionPage } from "@/features/dashboard/generic-section-page";

export default async function InstituteDashboardSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  return <GenericDashboardSectionPage section={section} role="institution" />;
}