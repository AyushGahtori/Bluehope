import { demoProviders } from "@/data/demo";
import { conditions, services } from "@/data/taxonomy";
import type { ProviderSummary, RecommendationContext, RecommendationResult } from "@/types/domain";

const conditionNames = new Map(conditions.map((condition) => [condition.id, condition.name]));
const serviceNames = new Map(services.map((service) => [service.id, service.name]));

const weights = {
  condition: 45,
  service: 35,
  age: 20,
  distance: 18,
  experience: 10,
  rating: 10,
  completeness: 8,
};

function hasEligibility(provider: ProviderSummary, context: RecommendationContext) {
  const hasConditionInput = context.conditionIds.length > 0;
  const hasServiceInput = context.serviceIds.length > 0;
  const conditionMatch =
    !hasConditionInput || context.conditionIds.some((conditionId) => provider.conditions.includes(conditionId));
  const serviceMatch = !hasServiceInput || context.serviceIds.some((serviceId) => provider.services.includes(serviceId));

  return conditionMatch && serviceMatch;
}

export function recommendProviders(context: RecommendationContext): RecommendationResult[] {
  return demoProviders
    .filter((provider) => hasEligibility(provider, context))
    .map((provider) => {
      const reasons: string[] = [];
      let score = 0;

      const matchedConditions = context.conditionIds.filter((id) => provider.conditions.includes(id));
      const matchedServices = context.serviceIds.filter((id) => provider.services.includes(id));

      if (matchedConditions.length) {
        score += weights.condition * matchedConditions.length;
        reasons.push(
          `Supports ${matchedConditions.map((id) => conditionNames.get(id) ?? id).join(", ")}.`,
        );
      }

      if (matchedServices.length) {
        score += weights.service * matchedServices.length;
        reasons.push(`Offers ${matchedServices.map((id) => serviceNames.get(id) ?? id).join(", ")}.`);
      }

      if (context.age && provider.ageGroups.some((group) => group.includes(String(context.age)))) {
        score += weights.age;
        reasons.push("Matches the selected age context.");
      }

      if (provider.distanceKm !== undefined) {
        score += Math.max(0, weights.distance - provider.distanceKm);
        reasons.push(`${provider.distanceKm.toFixed(1)} km from the selected area.`);
      }

      score += Math.min(provider.yearsInService, 10) * weights.experience;
      score += provider.rating * weights.rating;
      score += (provider.profileCompleteness / 100) * weights.completeness;

      if (!reasons.length) {
        reasons.push("Recommended from available structured profile data.");
      }

      return { provider, score: Math.round(score), reasons };
    })
    .sort((a, b) => b.score - a.score);
}
