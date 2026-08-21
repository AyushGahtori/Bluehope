import { conditions, services } from "@/data/taxonomy";
import { demoProviders } from "@/data/demo";
import type { ProviderSummary } from "@/types/domain";

export type SearchParams = {
  q?: string;
  service?: string;
  condition?: string;
  age?: string;
  radius?: number;
  providerType?: string;
  language?: string;
  online?: boolean;
  homeVisit?: boolean;
  sort?: "most-relevant" | "nearest" | "highest-rated" | "most-experienced" | "recommended";
  page?: number;
  limit?: number;
};

const serviceById = new Map(services.map((service) => [service.id, service]));
const conditionById = new Map(conditions.map((condition) => [condition.id, condition]));

function normalize(value = "") {
  return value.toLowerCase().trim();
}

function textForProvider(provider: ProviderSummary) {
  const serviceText = provider.services.map((id) => serviceById.get(id)?.name ?? id).join(" ");
  const conditionText = provider.conditions.map((id) => conditionById.get(id)?.name ?? id).join(" ");

  return normalize(
    [
      provider.name,
      provider.title,
      provider.description,
      serviceText,
      conditionText,
      provider.location.city,
      provider.location.locality,
      provider.languages.join(" "),
    ].join(" "),
  );
}

function relevanceScore(provider: ProviderSummary, params: SearchParams) {
  let score = 0;
  const q = normalize(params.q);
  const providerText = textForProvider(provider);

  if (q && providerText.includes(q)) score += 24;
  if (q && provider.name.toLowerCase().includes(q)) score += 18;
  if (params.service && provider.services.includes(params.service)) score += 40;
  if (params.condition && provider.conditions.includes(params.condition)) score += 44;
  if (params.age && provider.ageGroups.some((ageGroup) => normalize(ageGroup).includes(normalize(params.age)))) {
    score += 18;
  }
  if (provider.distanceKm !== undefined) score += Math.max(0, 20 - provider.distanceKm);
  score += provider.rating * 2;
  score += provider.profileCompleteness / 20;

  return score;
}

export function searchProviders(params: SearchParams) {
  const radius = params.radius ?? 20;
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 50);

  const filtered = demoProviders
    .filter((provider) => !params.providerType || provider.providerType === params.providerType)
    .filter((provider) => !params.service || provider.services.includes(params.service))
    .filter((provider) => !params.condition || provider.conditions.includes(params.condition))
    .filter((provider) => !params.language || provider.languages.includes(params.language))
    .filter((provider) => !params.online || provider.modes.includes("online"))
    .filter((provider) => !params.homeVisit || provider.modes.includes("home_visit"))
    .filter((provider) => provider.distanceKm === undefined || provider.distanceKm <= radius)
    .map((provider) => ({ provider, score: relevanceScore(provider, params) }))
    .filter((result) => {
      const q = normalize(params.q);
      return !q || result.score > 0 || textForProvider(result.provider).includes(q);
    });

  filtered.sort((a, b) => {
    if (params.sort === "nearest") return (a.provider.distanceKm ?? 999) - (b.provider.distanceKm ?? 999);
    if (params.sort === "highest-rated") return b.provider.rating - a.provider.rating;
    if (params.sort === "most-experienced") return b.provider.yearsInService - a.provider.yearsInService;
    return b.score - a.score;
  });

  const start = (page - 1) * limit;
  return {
    total: filtered.length,
    page,
    limit,
    results: filtered.slice(start, start + limit).map((result) => ({
      ...result.provider,
      relevanceScore: result.score,
    })),
  };
}
