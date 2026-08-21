import type { NextRequest } from "next/server";
import { demoProviders } from "@/data/demo";
import { notFound, persistencePending } from "@/server/api-responses";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = demoProviders.find((item) => item.slug === slug && item.providerType === "sole_provider");

  if (!provider) return notFound("provider");

  return Response.json({ provider });
}

export async function PATCH() {
  return persistencePending("provider");
}
