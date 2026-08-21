import { demoProviders } from "@/data/demo";
import { persistencePending } from "@/server/api-responses";

export async function GET() {
  return Response.json({ providers: demoProviders.filter((provider) => provider.providerType === "sole_provider") });
}

export async function POST() {
  return persistencePending("provider");
}
