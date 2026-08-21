import { conditions } from "@/data/taxonomy";
import { notFound } from "@/server/api-responses";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const condition = conditions.find((item) => item.id === id || item.slug === id);

  if (!condition) return notFound("condition");

  return Response.json({ conditionId: condition.id, subcategories: condition.subcategories });
}
