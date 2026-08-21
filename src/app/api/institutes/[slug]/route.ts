import type { NextRequest } from "next/server";
import { demoProviders } from "@/data/demo";
import { notFound, persistencePending } from "@/server/api-responses";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const institute = demoProviders.find((item) => item.slug === slug && item.providerType === "institute");

  if (!institute) return notFound("institute");

  return Response.json({ institute });
}

export async function PATCH() {
  return persistencePending("institute");
}
