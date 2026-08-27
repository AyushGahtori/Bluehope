import { conditions, services } from "@/data/taxonomy";
import { demoProviders } from "@/data/demo";
import { listDiscoverableListings } from "@/server/firestore/repositories";
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
      provider.location.formattedAddress,
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

  // Structured location intent ("Haldwani") prioritizes matching areas without
  // hiding the rest — location boosts ranking, it never filters by itself.
  const locationTokens = tokenize(params.location).filter(
    (token) => token !== "near" && token !== "me",
  );
  if (locationTokens.length) {
    const areaTokens = new Set(
      tokenize(`${provider.location.locality} ${provider.location.city} ${provider.location.formattedAddress}`),
    );
    if (locationTokens.some((token) => areaTokens.has(token))) score += 20;
  }

  if (provider.distanceKm !== undefined) score += Math.max(0, 20 - provider.distanceKm);
  score += provider.rating * 2;
  score += provider.profileCompleteness / 20;

  return score;
}

/** Great-circle distance in kilometres between two coordinates. */
function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Origin = { latitude: number; longitude: number };

const geocodeCache = new Map<string, Origin | null>();

/**
 * Resolves a free-text location to coordinates for radius filtering.
 * Uses OpenStreetMap Nominatim (no API key) with a short timeout and an
 * in-memory cache. Fails open (null) — a failed lookup must never hide
 * listings; the caller then skips radius filtering entirely.
 */
async function resolveOrigin(locationText?: string): Promise<Origin | null> {
  const text = locationText?.trim();
  if (!text) return null;
  if (geocodeCache.has(text)) return geocodeCache.get(text) ?? null;

  let origin: Origin | null = null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BlueHope-Dev/0.1 (testing)" },
      signal: AbortSignal.timeout(2500),
    });
    if (response.ok) {
      const data = (await response.json()) as Array<{ lat: string; lon: string }>;
      const hit = data[0];
      if (hit) {
        const latitude = Number(hit.lat);
        const longitude = Number(hit.lon);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          origin = { latitude, longitude };
        }
      }
    }
  } catch {
    // Fail open: no origin means radius filtering is skipped, not an error.
  }

  geocodeCache.set(text, origin);
  return origin;
}

/**
 * Loads every discoverable listing: real registered providers/institutes from
 * Firestore merged with the development demo dataset. Real listings win on
 * slug collisions so a registered institute is never shadowed by demo data.
 * Firestore being unavailable degrades to demo-only instead of failing search.
 */
async function loadAllListings(): Promise<ProviderSummary[]> {
  let realListings: ProviderSummary[] = [];
  try {
    realListings = await listDiscoverableListings();
  } catch {
    realListings = [];
  }

  const seen = new Set(realListings.map((listing) => listing.slug));
  const demo = demoProviders.filter((provider) => !seen.has(provider.slug));
  return [...realListings, ...demo];
}

export async function searchProviders(params: SearchParams) {
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 50);

  const all = await loadAllListings();

  // Radius filtering is strictly opt-in: without an explicit radius every
  // India-wide listing is discoverable (testing-phase behavior). When a radius
  // is set, distances are recomputed from the geocoded search location; if the
  // location cannot be resolved, radius filtering is skipped rather than
  // guessing or crashing.
  let candidates = all;
  if (params.radius !== undefined) {
    const origin = await resolveOrigin(params.location);
    if (origin) {
      candidates = all
        .map((provider) => {
          const [longitude, latitude] = provider.location.coordinates.coordinates;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return provider;
          const distanceKm = haversineKm(origin, { latitude, longitude });
          return { ...provider, distanceKm };
        })
        .filter((provider) => (provider.distanceKm ?? Infinity) <= params.radius!);
    }
  }

  const filtered = candidates
    .filter((provider) => !params.providerType || provider.providerType === params.providerType)
    .filter((provider) => !params.service || provider.services.includes(params.service))
    .filter((provider) => !params.condition || provider.conditions.includes(params.condition))
    .filter((provider) => !params.language || provider.languages.includes(params.language))
    .filter((provider) => !params.online || provider.modes.includes("online"))
    .filter((provider) => !params.homeVisit || provider.modes.includes("home_visit"))
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