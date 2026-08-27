import { notFound } from "next/navigation";
import { demoProviders } from "@/data/demo";
import { getListingSummaryBySlug } from "@/server/firestore/repositories";
import { ProfilePage } from "@/features/marketplace/profile-page";

export default async function InstitutePage({ params }: PageProps<"/institutes/[slug]">) {
  const { slug } = await params;

  // Real registered institutes take precedence; demo data is the fallback so
  // the development dataset keeps working when Firestore is not configured.
  const realListing = await getListingSummaryBySlug(slug).catch(() => null);
  const institute =
    realListing?.providerType === "institute"
      ? realListing
      : demoProviders.find((item) => item.slug === slug && item.providerType === "institute");
  if (!institute) notFound();

  return <ProfilePage profile={institute} />;
}