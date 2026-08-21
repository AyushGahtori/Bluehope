import type { FieldValue, GeoPoint, Timestamp } from "firebase-admin/firestore";

export const COLLECTIONS = {
  users: "users",
  customerProfiles: "customerProfiles",
  childProfiles: "childProfiles",
  providerProfiles: "providerProfiles",
  institutionProfiles: "institutionProfiles",
  institutionStaff: "institutionStaff",
  conditions: "conditions",
  conditionSubcategories: "conditionSubcategories",
  services: "services",
  listings: "listings",
  searchListings: "searchListings",
  recommendationFeatures: "recommendationFeatures",
  reviews: "reviews",
  reviewReports: "reviewReports",
  conversations: "conversations",
  messages: "messages",
  savedProviders: "savedProviders",
  enquiries: "enquiries",
  bookings: "bookings",
  notifications: "notifications",
  mediaAssets: "mediaAssets",
  auditLogs: "auditLogs",
  analyticsEvents: "analyticsEvents",
  searchHistory: "searchHistory",
} as const;

export type FirestoreCollection = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export type AccountRole =
  | "customer"
  | "soleProvider"
  | "institution"
  | "staff"
  | "moderator"
  | "admin";

export type AccountStatus = "active" | "pending" | "suspended" | "deleted";
export type ListingType = "soleProvider" | "institution";
export type ListingStatus = "draft" | "pendingReview" | "active" | "paused" | "rejected" | "archived";
export type ModerationState = "pending" | "approved" | "rejected" | "hidden";
export type VerificationStatus = "notRequested" | "pending" | "verified" | "rejected" | "expired";
export type ContactMethod = "phone" | "email" | "whatsapp" | "inApp";
export type TimestampLike = Timestamp | FieldValue;

export type FirestoreLocation = {
  geo: GeoPoint;
  formattedAddress: string;
  city: string;
  locality?: string;
  state: string;
  country: string;
  postalCode?: string;
  publicPrecision: "locality" | "approximate" | "exactBusiness";
};

export type RatingSummary = {
  average: number;
  total: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type UserDocument = {
  uid: string;
  email?: string | null;
  phone?: string | null;
  role: AccountRole;
  authProvider: string[];
  accountStatus: AccountStatus;
  displayName?: string | null;
  photoURL?: string | null;
  onboardingCompleted: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  lastLoginAt?: TimestampLike;
  deletedAt?: TimestampLike | null;
};

export type CustomerProfileDocument = {
  uid: string;
  firstName?: string;
  lastName?: string;
  profilePhotoRef?: string;
  preferredContactMethod?: ContactMethod;
  locationPreference?: FirestoreLocation;
  preferences: {
    languageIds: string[];
    serviceIds: string[];
    conditionIds: string[];
    online: boolean;
    homeVisit: boolean;
  };
  onboardingCompleted: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ChildProfileDocument = {
  childId: string;
  ownerUid: string;
  relationship: "self" | "child" | "sibling" | "relative" | "other";
  firstName?: string;
  birthYear?: number;
  ageBand?: string;
  gender?: string;
  conditionIds: string[];
  supportNeedIds: string[];
  preferredServiceIds: string[];
  locationContext?: FirestoreLocation;
  recommendationProfile: {
    serviceIds: string[];
    conditionIds: string[];
    ageGroups: string[];
    languageIds: string[];
  };
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  deletedAt?: TimestampLike | null;
};

export type TaxonomyDocument = {
  id: string;
  slug: string;
  label: string;
  parentFriendlyLabel: string;
  category: string;
  description?: string;
  aliases: string[];
  sortOrder: number;
  active: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ProviderProfileDocument = {
  providerId: string;
  ownerUid: string;
  listingId: string;
  displayName: string;
  slug: string;
  professionalTitle: string;
  biography?: string;
  philosophy?: string;
  serviceIds: string[];
  conditionIds: string[];
  ageGroups: string[];
  languages: string[];
  modes: Array<"clinic" | "online" | "homeVisit">;
  yearsOfExperience?: number;
  pricing?: {
    currency: "INR";
    minFee?: number;
    maxFee?: number;
    sessionLabel?: string;
  };
  location?: FirestoreLocation;
  education: string[];
  certifications: string[];
  affiliations: string[];
  verificationStatus: VerificationStatus;
  profileStatus: ListingStatus;
  profileCompleteness: number;
  ratingSummary: RatingSummary;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type InstitutionProfileDocument = {
  institutionId: string;
  ownerUid: string;
  listingId: string;
  organizationName: string;
  slug: string;
  organizationType: string;
  description?: string;
  foundedYear?: number;
  representative: {
    uid: string;
    name?: string;
    designation?: string;
  };
  serviceIds: string[];
  conditionIds: string[];
  ageGroups: string[];
  languages: string[];
  locations: FirestoreLocation[];
  branchIds: string[];
  staffUids: string[];
  facilities: string[];
  verificationStatus: VerificationStatus;
  profileStatus: ListingStatus;
  ratingSummary: RatingSummary;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type ListingDocument = {
  listingId: string;
  ownerUid: string;
  ownerType: ListingType;
  sourceCollection: "providerProfiles" | "institutionProfiles";
  sourceId: string;
  title: string;
  slug: string;
  shortDescription: string;
  serviceIds: string[];
  conditionIds: string[];
  ageGroups: string[];
  languages: string[];
  location?: FirestoreLocation;
  availabilityFlags: {
    clinic: boolean;
    online: boolean;
    homeVisit: boolean;
  };
  pricingSummary?: {
    minFee?: number;
    maxFee?: number;
    currency: "INR";
  };
  ratingSummary: RatingSummary;
  verificationStatus: VerificationStatus;
  profileStatus: ListingStatus;
  searchTokens: string[];
  searchKeywords: string[];
  rankingFeatures: {
    relevanceBoost: number;
    profileCompleteness: number;
    popularityScore: number;
    trustScore: number;
  };
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type SearchListingDocument = Omit<
  ListingDocument,
  "shortDescription" | "pricingSummary" | "createdAt" | "updatedAt"
> & {
  normalizedTitle: string;
  city?: string;
  locality?: string;
  state?: string;
  primaryAgeGroup?: string;
  geohashPrefix5?: string;
  rating: number;
  totalReviews: number;
  experienceYears?: number;
  updatedAt: TimestampLike;
};

export type MediaAssetDocument = {
  mediaId: string;
  ownerUid: string;
  ownerType: "user" | "provider" | "institution" | "review" | "document";
  ownerId: string;
  storagePath: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  variants: Array<{
    label: "thumbnail" | "card" | "medium" | "full" | "videoPreview";
    storagePath: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  }>;
  moderationState: ModerationState;
  visibility: "public" | "authenticated" | "ownerOnly" | "adminOnly";
  uploadedAt: TimestampLike;
  deletedAt?: TimestampLike | null;
};

export type ReviewDocument = {
  reviewId: string;
  listingId: string;
  authorUid: string;
  bookingId?: string;
  rating: number;
  text?: string;
  mediaIds: string[];
  status: "draft" | "published" | "removed";
  moderationState: ModerationState;
  verifiedBooking: boolean;
  fraudFlags: string[];
  reportCount: number;
  helpfulCount: number;
  parentReviewId?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type BookingDocument = {
  bookingId: string;
  customerUid: string;
  childId?: string;
  listingId: string;
  providerUid?: string;
  institutionId?: string;
  serviceId: string;
  startsAt: TimestampLike;
  endsAt: TimestampLike;
  status: "requested" | "confirmed" | "completed" | "cancelled" | "rejected" | "noShow";
  paymentState: "notRequired" | "pending" | "paid" | "refunded";
  notes?: string;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
};

export type AuditLogDocument = {
  actorUid: string;
  actorRole: AccountRole;
  action: string;
  targetCollection: FirestoreCollection;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipHash?: string;
  userAgentHash?: string;
  createdAt: TimestampLike;
};
