import { z } from "zod";
import { searchProviders } from "@/services/search-service";

const searchSchema = z.object({
  q: z.string().optional(),
  service: z.string().optional(),
  condition: z.string().optional(),
  age: z.string().optional(),
  radius: z.coerce.number().min(1).max(100).optional(),
  providerType: z.string().optional(),
  language: z.string().optional(),
  online: z.coerce.boolean().optional(),
  homeVisit: z.coerce.boolean().optional(),
  sort: z
    .enum(["most-relevant", "nearest", "highest-rated", "most-experienced", "recommended"])
    .optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return Response.json({ status: "invalid_query", issues: parsed.error.flatten() }, { status: 400 });
  }

  return Response.json(searchProviders(parsed.data));
}
