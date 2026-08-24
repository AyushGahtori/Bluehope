import { z } from "zod";

export const accountRoleSchema = z.enum([
  "customer",
  "soleProvider",
  "institution",
  "staff",
  "moderator",
  "admin",
]);

export const geoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  formattedAddress: z.string().min(3).max(500),
  city: z.string().min(1).max(120),
  locality: z.string().max(160).optional(),
  state: z.string().min(1).max(120),
  country: z.string().min(2).max(120),
  postalCode: z.string().max(20).optional(),
  publicPrecision: z.enum(["locality", "approximate", "exactBusiness"]).default("locality"),
});

export const upsertUserSchema = z.object({
  role: accountRoleSchema.default("customer"),
  displayName: z.string().max(160).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const customerProfileSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  preferredContactMethod: z.enum(["phone", "email", "whatsapp", "inApp"]).optional(),
  locationPreference: geoLocationSchema.optional(),
  preferences: z
    .object({
      languageIds: z.array(z.string().min(1)).max(20).default([]),
      serviceIds: z.array(z.string().min(1)).max(40).default([]),
      conditionIds: z.array(z.string().min(1)).max(40).default([]),
      online: z.boolean().default(false),
      homeVisit: z.boolean().default(false),
    })
    .optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const childProfileSchema = z.object({
  relationship: z.enum(["self", "child", "sibling", "relative", "other"]),
  firstName: z.string().max(80).optional(),
  birthYear: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  ageBand: z.string().max(40).optional(),
  gender: z.string().max(60).optional(),
  conditionIds: z.array(z.string().min(1)).max(30).default([]),
  supportNeedIds: z.array(z.string().min(1)).max(50).default([]),
  preferredServiceIds: z.array(z.string().min(1)).max(30).default([]),
  locationContext: geoLocationSchema.optional(),
});

export const listingSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  service: z.string().trim().max(80).optional(),
  condition: z.string().trim().max(80).optional(),
  age: z.string().trim().max(40).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).optional(),
  providerType: z.enum(["soleProvider", "institution"]).optional(),
  language: z.string().trim().max(80).optional(),
  priceRange: z.string().trim().max(40).optional(),
  online: z.coerce.boolean().optional(),
  homeVisit: z.coerce.boolean().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z
    .enum(["most-relevant", "nearest", "highest-rated", "most-experienced", "recommended"])
    .optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export const reviewSchema = z.object({
  listingId: z.string().min(1),
  bookingId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(3000).optional(),
  mediaIds: z.array(z.string().min(1)).max(6).default([]),
});

export const enquirySchema = z.object({
  listingId: z.string().min(1),
  childId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  message: z.string().min(1).max(2000),
});

export const bookingSchema = z.object({
  listingId: z.string().min(1),
  childId: z.string().min(1).optional(),
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  notes: z.string().max(1500).optional(),
});

export const reviewReplySchema = z.object({
  text: z.string().min(1).max(2000),
  mediaIds: z.array(z.string().min(1)).max(3).default([]),
});

export const availabilitySlotSchema = z.object({
  listingId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(24).default(1),
  blocked: z.boolean().default(false),
  mode: z.enum(["clinic", "online", "homeVisit"]).default("clinic"),
});

export const conversationCreateSchema = z.object({
  participantUids: z.array(z.string().min(1)).min(2).max(10),
  relatedEntityType: z.enum(["enquiry", "booking", "listing"]).optional(),
  relatedEntityId: z.string().min(1).optional(),
});

export const messageSchema = z.object({
  text: z.string().max(4000).optional(),
  attachmentMediaIds: z.array(z.string().min(1)).max(5).default([]),
}).refine(
  (value) => (value.text && value.text.length > 0) || value.attachmentMediaIds.length > 0,
  { message: "Message must contain text or at least one attachment" },
);
