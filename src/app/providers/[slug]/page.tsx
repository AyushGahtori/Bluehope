import { notFound } from "next/navigation";
import { demoProviders } from "@/data/demo";
import { ProfilePage } from "@/features/marketplace/profile-page";

export default async function ProviderPage({ params }: PageProps<"/providers/[slug]">) {
  const { slug } = await params;
  const provider = demoProviders.find((item) => item.slug === slug && item.providerType === "sole_provider");
  if (!provider) notFound();

  return <ProfilePage profile={provider} />;
}
