import { GenericDashboardSectionPage } from "@/features/dashboard/generic-section-page";

export default async function ProviderDashboardSectionPage({
  params,
}: PageProps<"/dashboard/provider/[section]">) {
  const { section } = await params;

  return <GenericDashboardSectionPage section={section} role="provider" />;
}
