import { conditions } from "@/data/taxonomy";

export async function GET() {
  return Response.json({ conditions });
}
