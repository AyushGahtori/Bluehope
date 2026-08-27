import { notFound } from "next/navigation";
import { demoProviders } from "@/data/demo";
import { getListingSummaryBySlug } from "@/server/firestore/repositories";
import { ProfilePage } from "@/features/marketplace/profile-page";

export default async function ProviderPage({ params }: PageProps<"/providers/[slug]">) {
  const { slug } = await params;

  // Real registered sole providers take precedence; demo data is the fallback
  // so the development dataset keeps working when Firestore is not configured.
  const realListing = await getListingSummaryBySlug(slug).catch(() => null);
  const provider =
    realListing?.providerType === "sole_provider"
      ? realListing
      : demoProviders.find((item) => item.slug === slug && item.providerType === "sole_provider");
  if (!provider) notFound();

  return <ProfilePage profile={provider} />;
}