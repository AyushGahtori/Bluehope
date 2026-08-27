import { redirect } from "next/navigation";
import { ParentSectionPage } from "@/features/dashboard/parent-section-page";

export default async function ParentDashboardSectionPage({
  params,
}: PageProps<"/dashboard/parent/[section]">) {
  const { section } = await params;

  if (section === "search") {
    redirect("/dashboard/parent/search");
  }

  return <ParentSectionPage section={section} />;
}
