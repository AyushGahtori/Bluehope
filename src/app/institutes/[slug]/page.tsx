import { notFound } from "next/navigation";
import { demoProviders } from "@/data/demo";
import { ProfilePage } from "@/features/marketplace/profile-page";

export default async function InstitutePage({ params }: PageProps<"/institutes/[slug]">) {
  const { slug } = await params;
  const institute = demoProviders.find((item) => item.slug === slug && item.providerType === "institute");
  if (!institute) notFound();

  return <ProfilePage profile={institute} />;
}
