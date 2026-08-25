import "server-only";

import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import {
  ACCOUNT_ROLES,
  COLLECTIONS,
  type ChildProfileDocument,
  type CustomerProfileDocument,
  type FirestoreLocation,
  type SelfServeAccountRole,
  type UserDocument,
} from "@/models/firestore";
import {
  childProfileSchema,
  customerProfileSchema,
  geoLocationSchema,
  upsertUserSchema,
} from "@/models/validation";
import { getAdminFirestore } from "@/server/firebase/admin";
import type { z } from "zod";

export class FirestoreUnavailableError extends Error {
  constructor() {
    super("Firebase Admin Firestore is not configured.");
  }
}

function db() {
  const firestore = getAdminFirestore();
  if (!firestore) throw new FirestoreUnavailableError();
  return firestore;
}

/** Compares Firestore timestamps / dates / ISO strings without throwing. */
function compareTimestamps(
  a: unknown,
  b: unknown,
): number {
  const toMillis = (value: unknown): number => {
    if (!value) return 0;
    if (typeof value === "object" && "toMillis" in (value as object)) {
      try {
        return (value as { toMillis(): number }).toMillis();
      } catch {
        return 0;
      }
    }
    if (typeof value === "object" && "seconds" in (value as object)) {
      const { seconds, nanoseconds } = value as { seconds: number; nanoseconds?: number };
      return seconds * 1000 + Math.floor((nanoseconds ?? 0) / 1e6);
    }
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return toMillis(a) - toMillis(b);
}

type LocationInput = z.infer<typeof geoLocationSchema>;

function toFirestoreLocation(location: LocationInput): FirestoreLocation {
  return {
    geo: new GeoPoint(location.latitude, location.longitude),
    formattedAddress: location.formattedAddress,
    city: location.city,
    locality: location.locality,
    state: location.state,
    country: location.country,
    postalCode: location.postalCode,
    publicPrecision: location.publicPrecision,
  };
}

function publicUserData(data?: FirebaseFirestore.DocumentData): Partial<UserDocument> | null {
  if (!data) return null;

  return {
    uid: data.uid,
    email: data.email ?? null,
    phone: data.phone ?? null,
    role: data.role,
    authProvider: data.authProvider ?? [],
    accountStatus: data.accountStatus,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    onboardingCompleted: Boolean(data.onboardingCompleted),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lastLoginAt: data.lastLoginAt,
  };
}

export async function getUserByUid(uid: string) {
  const snapshot = await db().collection(COLLECTIONS.users).doc(uid).get();
  return publicUserData(snapshot.data());
}

export async function upsertUserFromAuth(
  uid: string,
  authData: {
    email?: string | null;
    phone?: string | null;
    providerIds?: string[];
    displayName?: string | null;
    photoURL?: string | null;
  },
  body: unknown,
) {
  const parsed = upsertUserSchema.parse(body);
  const reference = db().collection(COLLECTIONS.users).doc(uid);
  const now = FieldValue.serverTimestamp();
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    // First write establishes the account; the requested role becomes permanent.
    const payload: Partial<UserDocument> = {
      uid,
      email: authData.email ?? null,
      phone: authData.phone ?? null,
      role: parsed.role,
      authProvider: authData.providerIds ?? [],
      accountStatus: "active",
      displayName: parsed.displayName ?? authData.displayName ?? null,
      photoURL: authData.photoURL ?? null,
      onboardingCompleted: parsed.onboardingCompleted ?? false,
      updatedAt: now,
      lastLoginAt: now,
    };

    await reference.set({ ...payload, createdAt: now }, { merge: true });
  } else {
    // Existing accounts keep their authoritative role and status; only
    // display attributes and login metadata may change here.
    await reference.set(
      {
        uid,
        email: authData.email ?? null,
        phone: authData.phone ?? null,
        authProvider: authData.providerIds ?? [],
        displayName: parsed.displayName ?? authData.displayName ?? null,
        photoURL: authData.photoURL ?? null,
        onboardingCompleted: parsed.onboardingCompleted ?? false,
        updatedAt: now,
        lastLoginAt: now,
      },
      { merge: true },
    );
  }

  const updated = await reference.get();
  return publicUserData(updated.data());
}

export type EstablishRoleResult =
  | { status: "created"; role: SelfServeAccountRole }
  | { status: "existing"; role: SelfServeAccountRole }
  | { status: "conflict"; role: SelfServeAccountRole };

/**
 * Authoritative role assignment keyed by Firebase UID. A single direct
 * document lookup decides whether the account is created with the desired
 * role, continued under its matching role, or blocked by a role conflict.
 */
export async function establishUserRole(
  uid: string,
  desiredRole: string,
  profile: {
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    providerIds?: string[];
  } = {},
): Promise<EstablishRoleResult | { status: "invalid_role" }> {
  if (!ACCOUNT_ROLES.includes(desiredRole as SelfServeAccountRole)) {
    return { status: "invalid_role" };
  }

  const role = desiredRole as SelfServeAccountRole;
  const reference = db().collection(COLLECTIONS.users).doc(uid);
  const now = FieldValue.serverTimestamp();
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    const payload: Partial<UserDocument> = {
      uid,
      email: profile.email ?? null,
      phone: null,
      role,
      authProvider: profile.providerIds ?? ["google.com"],
      accountStatus: "active",
      displayName: profile.displayName ?? null,
      photoURL: profile.photoURL ?? null,
      onboardingCompleted: false,
      updatedAt: now,
      lastLoginAt: now,
    };
    await reference.set({ ...payload, createdAt: now }, { merge: true });
    return { status: "created", role };
  }

  const data = snapshot.data() as Partial<UserDocument> | undefined;
  const existingRole = data?.role;

  if (existingRole && existingRole !== role) {
    return { status: "conflict", role: existingRole as SelfServeAccountRole };
  }

  await reference.set(
    {
      uid,
      ...(profile.email !== undefined ? { email: profile.email } : {}),
      ...(profile.displayName ? { displayName: profile.displayName } : {}),
      ...(profile.photoURL ? { photoURL: profile.photoURL } : {}),
      ...(profile.providerIds?.length ? { authProvider: profile.providerIds } : {}),
      updatedAt: now,
      lastLoginAt: now,
    },
    { merge: true },
  );
  return { status: "existing", role: (existingRole ?? role) as SelfServeAccountRole };
}

export async function getCustomerProfile(uid: string) {
  const snapshot = await db().collection(COLLECTIONS.customerProfiles).doc(uid).get();
  return snapshot.exists ? (snapshot.data() as CustomerProfileDocument) : null;
}

export async function upsertCustomerProfile(uid: string, body: unknown) {
  const parsed = customerProfileSchema.parse(body);
  const reference = db().collection(COLLECTIONS.customerProfiles).doc(uid);
  const now = FieldValue.serverTimestamp();
  const locationPreference = parsed.locationPreference
    ? toFirestoreLocation(parsed.locationPreference)
    : undefined;

  await reference.set(
    {
      uid,
      ...parsed,
      ...(locationPreference ? { locationPreference } : {}),
      preferences: parsed.preferences ?? {
        languageIds: [],
        serviceIds: [],
        conditionIds: [],
        online: false,
        homeVisit: false,
      },
      updatedAt: now,
      createdAt: now,
    },
    { merge: true },
  );

  const snapshot = await reference.get();
  return snapshot.data() as CustomerProfileDocument;
}

export async function listChildProfiles(uid: string, limit = 25) {
  const snapshot = await db()
    .collection(COLLECTIONS.childProfiles)
    .where("ownerUid", "==", uid)
    .where("deletedAt", "==", null)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ChildProfileDocument);
}

export async function createChildProfile(uid: string, body: unknown) {
  const parsed = childProfileSchema.parse(body);
  const reference = db().collection(COLLECTIONS.childProfiles).doc();
  const now = FieldValue.serverTimestamp();
  const locationContext = parsed.locationContext
    ? toFirestoreLocation(parsed.locationContext)
    : undefined;

  const child: ChildProfileDocument = {
    childId: reference.id,
    ownerUid: uid,
    relationship: parsed.relationship,
    firstName: parsed.firstName,
    birthYear: parsed.birthYear,
    ageBand: parsed.ageBand,
    gender: parsed.gender,
    conditionIds: parsed.conditionIds,
    supportNeedIds: parsed.supportNeedIds,
    preferredServiceIds: parsed.preferredServiceIds,
    ...(locationContext ? { locationContext } : {}),
    recommendationProfile: {
      serviceIds: parsed.preferredServiceIds,
      conditionIds: parsed.conditionIds,
      ageGroups: parsed.ageBand ? [parsed.ageBand] : [],
      languageIds: [],
    },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await reference.set(child);
  return child;
}

export async function getChildProfile(uid: string, childId: string) {
  const snapshot = await db().collection(COLLECTIONS.childProfiles).doc(childId).get();
  if (!snapshot.exists) return null;

  const child = snapshot.data() as ChildProfileDocument;
  if (child.ownerUid !== uid || child.deletedAt) return null;
  return child;
}

export async function updateChildProfile(uid: string, childId: string, body: unknown) {
  const existing = await getChildProfile(uid, childId);
  if (!existing) return null;

  const parsed = childProfileSchema.partial().parse(body);
  const locationContext = parsed.locationContext
    ? toFirestoreLocation(parsed.locationContext)
    : undefined;
  const payload = {
    ...parsed,
    ...(locationContext ? { locationContext } : {}),
    ...(parsed.conditionIds || parsed.preferredServiceIds || parsed.ageBand
      ? {
          recommendationProfile: {
            serviceIds: parsed.preferredServiceIds ?? existing.preferredServiceIds,
            conditionIds: parsed.conditionIds ?? existing.conditionIds,
            ageGroups: parsed.ageBand ? [parsed.ageBand] : existing.recommendationProfile.ageGroups,
            languageIds: existing.recommendationProfile.languageIds,
          },
        }
      : {}),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db().collection(COLLECTIONS.childProfiles).doc(childId).set(payload, { merge: true });
  return getChildProfile(uid, childId);
}

export type ProviderProfileKind = "soleProvider" | "institution";

export type ProviderProfileView = {
  id: string;
  ownerUid: string;
  listingId: string;
  kind: ProviderProfileKind;
  name: string;
  tagline: string;
  bio: string;
  images: string[];
  services: string[];
  conditions: string[];
  weeklyHours: Record<string, { open: string; close: string } | null>;
  location: {
    text: string;
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  pricing: { minFee: string; maxFee: string; sessionLabel: string };
  contact: { phone: string; email: string; whatsapp: string };
  details: { officialName: string; foundedYear: string; registrationNumber: string; website: string };
  profileCompleteness: number;
  missingItems: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** Sections that define profile completion. Optional features (Q&A,
 * verification) intentionally do not count toward basic completion. */
const COMPLETION_SECTIONS: Array<{ key: string; label: string; isComplete: (p: ProviderProfileView) => boolean }> = [
  { key: "name", label: "Basic info", isComplete: (p) => p.name.trim().length > 0 },
  { key: "images", label: "Photos", isComplete: (p) => p.images.length > 0 },
  { key: "bio", label: "Bio", isComplete: (p) => p.bio.trim().length >= 80 },
  { key: "services", label: "Services", isComplete: (p) => p.services.length > 0 },
  { key: "conditions", label: "Conditions", isComplete: (p) => p.conditions.length > 0 },
  {
    key: "hours",
    label: "Opening hours",
    isComplete: (p) => Object.values(p.weeklyHours).some((entry) => entry !== null),
  },
  { key: "location", label: "Location", isComplete: (p) => Boolean(p.location?.text) },
  {
    key: "pricing",
    label: "Pricing",
    isComplete: (p) => Boolean(p.pricing.minFee || p.pricing.maxFee),
  },
  {
    key: "contact",
    label: "Contact details",
    isComplete: (p) => Boolean(p.contact.phone || p.contact.email),
  },
];

export function computeProfileCompletion(profile: ProviderProfileView) {
  const missing = COMPLETION_SECTIONS.filter((section) => !section.isComplete(profile)).map(
    (section) => section.label,
  );
  const percent = Math.round(((COMPLETION_SECTIONS.length - missing.length) / COMPLETION_SECTIONS.length) * 100);
  return { percent, missingItems: missing };
}

function normalizeProfile(
  id: string,
  kind: ProviderProfileKind,
  data: FirebaseFirestore.DocumentData,
): ProviderProfileView {
  const location = (data.location ?? null) as ProviderProfileView["location"];
  const view: ProviderProfileView = {
    id,
    ownerUid: data.ownerUid,
    listingId: data.listingId ?? id,
    kind,
    name: data.name ?? data.organizationName ?? "",
    tagline: data.tagline ?? "",
    bio: data.bio ?? "",
    images: Array.isArray(data.images) ? data.images : [],
    services: Array.isArray(data.services) ? data.services : [],
    conditions: Array.isArray(data.conditions) ? data.conditions : [],
    weeklyHours: data.weeklyHours ?? {},
    location,
    pricing: data.pricing ?? { minFee: "", maxFee: "", sessionLabel: "" },
    contact: data.contact ?? { phone: "", email: "", whatsapp: "" },
    details: data.details ?? { officialName: "", foundedYear: "", registrationNumber: "", website: "" },
    profileCompleteness: typeof data.profileCompleteness === "number" ? data.profileCompleteness : 0,
    missingItems: [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  const completion = computeProfileCompletion(view);
  return { ...view, profileCompleteness: completion.percent, missingItems: completion.missingItems };
}

function profileCollectionFor(kind: ProviderProfileKind) {
  return kind === "institution"
    ? db().collection(COLLECTIONS.institutionProfiles)
    : db().collection(COLLECTIONS.providerProfiles);
}

/** Finds the caller's own profile document — a direct ownerUid-scoped query. */
export async function getProviderProfileByOwner(
  uid: string,
  kind: ProviderProfileKind,
): Promise<ProviderProfileView | null> {
  const snapshot = await profileCollectionFor(kind)
    .where("ownerUid", "==", uid)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return normalizeProfile(doc.id, kind, doc.data());
}

export async function upsertProviderProfile(
  uid: string,
  kind: ProviderProfileKind,
  patch: Record<string, unknown>,
): Promise<ProviderProfileView> {
  const collection = profileCollectionFor(kind);
  const existing = await getProviderProfileByOwner(uid, kind);
  const reference = existing ? collection.doc(existing.id) : collection.doc();
  const now = FieldValue.serverTimestamp();

  const base = existing
    ? {}
    : {
        ownerUid: uid,
        listingId: reference.id,
        profileStatus: "draft",
        createdAt: now,
      };

  await reference.set(
    {
      ...base,
      ...patch,
      ownerUid: uid,
      updatedAt: now,
    },
    { merge: true },
  );

  const saved = await reference.get();
  return normalizeProfile(reference.id, kind, saved.data() ?? {});
}

/**
 * Account-scoped dashboard queries. Every list is filtered by the verified
 * Firebase UID on the server — never fetched in bulk and filtered client-side.
 */
export async function listEnquiriesForProvider(uid: string, limit = 50) {
  // Single-field filter + limit requires no composite index; sorting is done
  // in memory so a missing index can never break the dashboard load.
  const snapshot = await db()
    .collection(COLLECTIONS.enquiries)
    .where("providerUid", "==", uid)
    .limit(limit)
    .get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string } & Record<string, unknown>)
    .sort((a, b) => compareTimestamps(b.createdAt, a.createdAt));
}

export async function listBookingsForProvider(uid: string, limit = 50) {
  const snapshot = await db()
    .collection(COLLECTIONS.bookings)
    .where("providerUid", "==", uid)
    .limit(limit)
    .get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string } & Record<string, unknown>)
    .sort((a, b) => compareTimestamps(a.startsAt, b.startsAt));
}

export async function listReviewsForProvider(uid: string, limit = 50) {
  const profile = await getProviderProfileByOwner(
    uid,
    "institution",
  ).catch(() => null);
  const providerProfile =
    profile ?? (await getProviderProfileByOwner(uid, "soleProvider").catch(() => null));
  if (!providerProfile) return [];

  const snapshot = await db()
    .collection(COLLECTIONS.reviews)
    .where("listingId", "==", providerProfile.listingId)
    .limit(limit)
    .get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string } & Record<string, unknown>)
    .sort((a, b) => compareTimestamps(b.createdAt, a.createdAt));
}

export async function softDeleteChildProfile(uid: string, childId: string) {
  const existing = await getChildProfile(uid, childId);
  if (!existing) return false;

  await db().collection(COLLECTIONS.childProfiles).doc(childId).set(
    {
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}
