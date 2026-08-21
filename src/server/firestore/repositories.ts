import "server-only";

import { FieldValue, GeoPoint } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  type ChildProfileDocument,
  type CustomerProfileDocument,
  type FirestoreLocation,
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

  await reference.set(
    {
      ...payload,
      createdAt: now,
    },
    { merge: true },
  );

  const snapshot = await reference.get();
  return publicUserData(snapshot.data());
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
