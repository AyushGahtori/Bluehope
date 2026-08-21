import { z } from "zod";
import { recommendProviders } from "@/services/recommendation-service";

const recommendationSchema = z.object({
  conditions: z.string().optional(),
  services: z.string().optional(),
  age: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = recommendationSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const recommendations = recommendProviders({
    conditionIds: parsed.conditions?.split(",").filter(Boolean) ?? [],
    supportNeedIds: [],
    serviceIds: parsed.services?.split(",").filter(Boolean) ?? [],
    age: parsed.age,
  });

  return Response.json({ recommendations });
}
