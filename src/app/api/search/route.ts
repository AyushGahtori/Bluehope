import { listingSearchSchema } from "@/models/validation";
import { searchProviders } from "@/services/search-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = listingSearchSchema.safeParse(params);

  if (!parsed.success) {
    return Response.json({ status: "invalid_query", issues: parsed.error.flatten() }, { status: 400 });
  }

  return Response.json(searchProviders(parsed.data));
}
