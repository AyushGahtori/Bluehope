import { demoProviders } from "@/data/demo";
import { notFound } from "@/server/api-responses";
import { isDemoRequest, listDemoReviews } from "@/server/demo-marketplace-store";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = demoProviders.find((item) => item.slug === slug);
  if (!provider) return notFound("provider");

  if (isDemoRequest(request)) {
    return Response.json({
      status: "ok",
      reviews: listDemoReviews(slug),
    });
  }

  return Response.json({
    reviews: listDemoReviews(slug),
    status: "ok",
  });
}
