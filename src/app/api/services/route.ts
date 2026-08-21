import { services } from "@/data/taxonomy";

export async function GET() {
  return Response.json({ services });
}
