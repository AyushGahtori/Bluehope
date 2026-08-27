/**
 * Client-side request identity helpers.
 *
 * BlueHope currently has two request modes:
 * - Demo/guest: no signed-in user on this device -> requests are marked with
 *   the shared demo header and served from the in-memory demo marketplace.
 * - Signed-in user: the Firebase UID is attached so every enquiry, booking,
 *   and saved item is stored under that specific account and never leaks
 *   into another account's dashboard.
 *
 * Once Firebase Admin credentials are configured, these endpoints will move
 * to verified ID tokens; the UID header is an interim identity marker for
 * the in-memory store only.
 */

type StoredAuthUser = {
  uid?: string;
  name?: string;
  email?: string;
};

export function storedAuthUser(): StoredAuthUser | null {
  try {
    const raw = window.localStorage.getItem("bluehope.authUser");
    const parsed = raw ? (JSON.parse(raw) as StoredAuthUser) : null;
    return parsed?.uid ? parsed : null;
  } catch {
    return null;
  }
}

export function isDemoSession(): boolean {
  return storedAuthUser() === null;
}

export async function apiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const user = storedAuthUser();
  if (user) {
    headers["x-bluehope-uid"] = user.uid!;
  } else {
    headers["x-bluehope-demo"] = "true";
  }

  return headers;
}

/**
 * Headers for authenticated dashboard/API requests. Attaches a verified
 * Firebase ID token so the server can resolve the account role and scope
 * every query to the caller's own data. Returns null when no user is signed
 * in — dashboard code must never fall back to the shared demo workspace.
 */
export async function authedApiHeaders(): Promise<Record<
  string,
  string
> | null> {
  try {
    const { getFirebaseAuth } = await import("@/config/firebase");
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!auth || !user) return null;

    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return null;
  }
}

/**
 * True when the request failed only because backend persistence (Firebase
 * Admin / Firestore) is not configured in this environment. Treated as an
 * empty-but-healthy state in the UI, never as a data error.
 */
export function isConfigurationPendingResponse(
  status: number,
  body: unknown,
): boolean {
  if (status !== 501) return false;
  return typeof body === "object" && body !== null && "status" in body
    ? (body as { status?: string }).status === "configuration_required"
    : false;
}
