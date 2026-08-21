import { ParentSectionPage } from "@/features/dashboard/parent-section-page";

export default async function ParentDashboardSectionPage({
  params,
}: PageProps<"/dashboard/parent/[section]">) {
  const { section } = await params;

  return <ParentSectionPage section={section} />;
}
