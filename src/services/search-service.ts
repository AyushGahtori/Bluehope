import { conditions, services } from "@/data/taxonomy";
import { demoProviders } from "@/data/demo";
import type { ProviderSummary } from "@/types/domain";

export type SearchParams = {
  q?: string;
  location?: string;
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

/** Splits free text into comparable word tokens ("autism speech therapy" -> ["autism","speech","therapy"]). */
function tokenize(value = "") {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
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

/** True when an age like 8 falls inside a group label such as "7-12 years". */
export function ageGroupMatches(ageGroups: string[], age?: number) {
  if (age === undefined || Number.isNaN(age)) return false;
  return ageGroups.some((group) => {
    const numbers = group.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length >= 2) return age >= numbers[0] && age <= numbers[1];
    if (numbers.length === 1) return age === numbers[0];
    return false;
  });
}

/**
 * Returns the relevance score, or null when the query rules the provider out.
 * A provider must match at least one query token to stay eligible — it can no
 * longer rank for unrelated searches purely because of its rating or distance.
 */
function relevanceScore(provider: ProviderSummary, params: SearchParams): number | null {
  const queryTokens = tokenize(params.q);
  const providerText = textForProvider(provider);
  const providerTokens = new Set(tokenize(providerText));
  const nameTokens = new Set(tokenize(provider.name));

  let score = 0;

  if (queryTokens.length) {
    const matched = queryTokens.filter((token) => providerTokens.has(token));
    if (matched.length === 0) return null;
    score += matched.length * 24;
    if (queryTokens.every((token) => nameTokens.has(token))) score += 18;
  }

  if (params.service && provider.services.includes(params.service)) score += 40;
  if (params.condition && provider.conditions.includes(params.condition)) score += 44;
  if (params.age && ageGroupMatches(provider.ageGroups, Number(params.age))) score += 18;

  // Structured location intent ("Andheri West") prioritizes matching areas
  // without hiding the rest when the demo dataset is area-limited.
  const locationTokens = tokenize(params.location).filter(
    (token) => token !== "near" && token !== "me",
  );
  if (locationTokens.length) {
    const areaTokens = new Set(
      tokenize(`${provider.location.locality} ${provider.location.city}`),
    );
    if (locationTokens.some((token) => areaTokens.has(token))) score += 20;
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
    .filter((result) => result.score !== null);

  filtered.sort((a, b) => {
    if (params.sort === "nearest") return (a.provider.distanceKm ?? 999) - (b.provider.distanceKm ?? 999);
    if (params.sort === "highest-rated") return b.provider.rating - a.provider.rating;
    if (params.sort === "most-experienced") return b.provider.yearsInService - a.provider.yearsInService;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const start = (page - 1) * limit;
  return {
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(Math.ceil(filtered.length / limit), 1),
    results: filtered.slice(start, start + limit).map((result) => ({
      ...result.provider,
      relevanceScore: result.score ?? 0,
    })),
  };
}