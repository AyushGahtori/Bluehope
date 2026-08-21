import Link from "next/link";
import { Heart, Languages, MapPin, Monitor, Star, Users } from "lucide-react";
import { Badge, Card, LinkButton } from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import { formatDistance } from "@/lib/utils";
import type { ProviderSummary } from "@/types/domain";

const serviceNames = new Map(services.map((service) => [service.id, service.name]));
const conditionNames = new Map(conditions.map((condition) => [condition.id, condition.name]));

export function ProviderCard({ provider }: { provider: ProviderSummary }) {
  const href =
    provider.providerType === "institute" ? `/institutes/${provider.slug}` : `/providers/${provider.slug}`;

  return (
    <Card className="grid gap-5 p-4 md:grid-cols-[220px_1fr_180px]">
      <div className="relative min-h-40 rounded-[8px] bg-slate-100">
        <Badge tone={provider.verificationStatus === "review_ready" ? "green" : "neutral"} className="absolute left-3 top-3">
          {provider.verificationStatus === "review_ready" ? "Profile reviewed" : "Trust setup pending"}
        </Badge>
        <button className="absolute right-3 top-3 rounded-md bg-blue-50 p-2" aria-label="Save provider">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div>
        <Link href={href} className="text-xl font-extrabold text-slate-950 hover:text-bluehope">
          {provider.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            {provider.rating}
          </span>
          <span>({provider.reviewCount} demo reviews)</span>
          <span>{provider.yearsInService} years in service</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {provider.services.map((id) => serviceNames.get(id) ?? id).join(", ")}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {provider.conditions.slice(0, 3).map((id) => conditionNames.get(id) ?? id).join(", ")}
        </p>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {provider.ageGroups.join(", ")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {provider.modes.map((mode) => mode.replace("_", "-")).join(", ")}
          </span>
          <span className="inline-flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {provider.languages.join(", ")}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-8 text-sm font-semibold">
          <span className="inline-flex items-center gap-2 text-bluehope">
            <MapPin className="h-4 w-4" />
            {provider.location.formattedAddress}
          </span>
          <span className="text-emerald-600">{formatDistance(provider.distanceKm)}</span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3 border-slate-200 md:border-l md:pl-6">
        <LinkButton href={href} variant="outline" className="w-full">
          View Profile
        </LinkButton>
        <LinkButton href={`${href}#contact`} variant="secondary" className="w-full">
          Contact
        </LinkButton>
      </div>
    </Card>
  );
}
