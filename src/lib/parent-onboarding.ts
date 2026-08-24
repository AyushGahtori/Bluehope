import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/config/firebase";

export type ParentOnboardingData = {
  supportFor: "myself" | "family";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  age: string;
  conditionIds: string[];
  locationText: string;
  /** Distinguishes device-derived location from user-entered location. */
  locationSource?: "browser_geolocation" | "manual" | null;
  locationCapturedAt?: string | null;
};

const COMPLETED_FLAG_KEY = "bluehope.onboardingCompleted";

type CompletedFlags = Record<string, boolean>;

function readCompletedFlags(): CompletedFlags {
  try {
    const raw = window.localStorage.getItem(COMPLETED_FLAG_KEY);
    return raw ? (JSON.parse(raw) as CompletedFlags) : {};
  } catch {
    return {};
  }
}

function markCompletedLocally(uid: string) {
  try {
    const flags = readCompletedFlags();
    flags[uid] = true;
    window.localStorage.setItem(COMPLETED_FLAG_KEY, JSON.stringify(flags));
  } catch {
    // Storage unavailable; Firestore remains the source of truth.
  }
}

/**
 * Synchronous local-only check used for instant redirects on page load.
 */
export function isParentOnboardingCompleteSync(uid: string): boolean {
  return readCompletedFlags()[uid] === true;
}

/**
 * Returns true when the parent has already finished onboarding for this UID.
 * Uses the local flag as a fast path and confirms against Firestore when the
 * flag is missing (for example on a new device).
 */
export async function isParentOnboardingComplete(
  uid: string,
): Promise<boolean> {
  if (readCompletedFlags()[uid]) return true;

  const firestore = getFirebaseFirestore();
  if (!firestore) return false;

  try {
    // Never let a slow/unreachable Firestore block the flow for more than
    // 1.5s — treat a timeout as "not complete" so onboarding continues.
    const snapshot = await Promise.race([
      getDoc(doc(firestore, "customerProfiles", uid)),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);

    if (snapshot && snapshot.exists() && snapshot.data()?.onboardingCompleted === true) {
      markCompletedLocally(uid);
      return true;
    }
    return false;
  } catch {
    // Firestore unreachable or rules denied; treat as incomplete.
    return false;
  }
}

/**
 * Persists parent onboarding data under the Firebase UID.
 * Writes users/{uid} and customerProfiles/{uid}, which the deployed security
 * rules restrict to the authenticated owner.
 */
export async function saveParentOnboarding(
  uid: string,
  data: ParentOnboardingData,
): Promise<"saved" | "saved_locally"> {
  const firestore = getFirebaseFirestore();
  if (!firestore) {
    markCompletedLocally(uid);
    return "saved_locally";
  }

  const writeProfile = async () => {
    const displayName = `${data.firstName} ${data.lastName}`.trim();

    await setDoc(
      doc(firestore, "users", uid),
      {
        uid,
        role: "customer",
        displayName: displayName || null,
        email: data.email || null,
        phone: data.phone || null,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(firestore, "customerProfiles", uid),
      {
        uid,
        supportFor: data.supportFor,
        relationship:
          data.supportFor === "family" ? data.relationship || "family" : "self",
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
        email: data.email || null,
        age: data.age || null,
        conditionIds: data.conditionIds,
        locationContext: data.locationText
          ? {
              formattedAddress: data.locationText,
              source: data.locationSource ?? "manual",
              capturedAt: data.locationCapturedAt ?? null,
            }
          : null,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  try {
    // Firestore writes can hang indefinitely when the database is not
    // enabled or unreachable — cap the wait at 5 seconds.
    const outcome = await Promise.race([
      writeProfile().then(() => "saved" as const),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (outcome === null) {
      console.warn(
        "[BlueHope] Onboarding cloud save timed out after 5s. " +
          "Is Cloud Firestore enabled for this Firebase project? " +
          "Falling back to a device-local completion flag.",
      );
      markCompletedLocally(uid);
      return "saved_locally";
    }

    markCompletedLocally(uid);
    return "saved";
  } catch (error) {
    // Firestore may be disabled or rules may deny the write. Keep the local
    // flag so this device still recognizes the completed onboarding.
    console.warn("[BlueHope] Onboarding cloud save failed:", error);
    markCompletedLocally(uid);
    return "saved_locally";
  }
}
