import { demoProviders } from "@/data/demo";
import { persistencePending } from "@/server/api-responses";

export async function GET() {
  return Response.json({ institutes: demoProviders.filter((provider) => provider.providerType === "institute") });
}

export async function POST() {
  return persistencePending("institute");
}
