export type Role = "parent" | "provider" | "institute";

export type VerificationStatus = "not_requested" | "pending" | "review_ready" | "verified";

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type LocationRecord = {
  formattedAddress: string;
  city: string;
  locality: string;
  state: string;
  country: string;
  postalCode?: string;
  coordinates: GeoPoint;
  publicPrecision: "locality" | "approximate" | "exact_business";
};

export type Condition = {
  id: string;
  name: string;
  slug: string;
  category: "diagnosis" | "support_need";
  description: string;
  active: boolean;
  subcategories: ConditionSubcategory[];
};

export type ConditionSubcategory = {
  id: string;
  conditionId: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  category: "therapy" | "education" | "medical" | "family_support";
  description: string;
  active: boolean;
};

export type ProviderType = "sole_provider" | "institute";

export type ProviderSummary = {
  id: string;
  slug: string;
  providerType: ProviderType;
  name: string;
  title: string;
  description: string;
  services: string[];
  conditions: string[];
  ageGroups: string[];
  languages: string[];
  modes: Array<"in_clinic" | "online" | "home_visit">;
  location: LocationRecord;
  rating: number;
  reviewCount: number;
  yearsInService: number;
  priceRange: "low" | "medium" | "high";
  profileCompleteness: number;
  verificationStatus: VerificationStatus;
  distanceKm?: number;
};

export type RecommendationContext = {
  conditionIds: string[];
  supportNeedIds: string[];
  age?: number;
  serviceIds: string[];
  location?: LocationRecord;
};

export type RecommendationResult = {
  provider: ProviderSummary;
  score: number;
  reasons: string[];
};
