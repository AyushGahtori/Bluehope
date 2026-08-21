import { demoProviders } from "@/data/demo";
import { notFound } from "@/server/api-responses";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = demoProviders.find((item) => item.slug === slug);
  if (!provider) return notFound("provider");

  return Response.json({
    reviews: [],
    status: "empty",
    message: "Reviews require completed eligible interactions before they are shown.",
  });
}
