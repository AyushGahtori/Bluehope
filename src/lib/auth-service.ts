"use client";

import { getFirebaseAuth, googleProvider } from "@/config/firebase";
import { clearStoredAuthUser } from "@/lib/auth-user-store";
import type { SelfServeAccountRole } from "@/models/firestore";

export type RoleConflict = {
  kind: "conflict";
  existingRole: SelfServeAccountRole;
};

export type AuthError = {
  kind: "error";
  code:
    | "popup-closed"
    | "popup-blocked"
    | "network"
    | "not-configured"
    | "server"
    | "unknown";
  message: string;
};

export type RoleEstablished = {
  kind: "ok";
  status: "created" | "existing";
  role: SelfServeAccountRole;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type RoleOutcome = RoleEstablished | RoleConflict | AuthError;

const FRIENDLY_MESSAGES: Record<AuthError["code"], string> = {
  "popup-closed": "The Google sign-in window was closed before finishing. Please try again.",
  "popup-blocked":
    "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.",
  network: "We couldn't reach BlueHope services. Check your connection and try again.",
  "not-configured": "Sign-in is not available right now. Please try again later.",
  server: "Something went wrong while setting up your account. Please try again.",
  unknown: "We couldn't complete sign-in. Please try again.",
};

/** Maps raw Firebase/network failures to stable, human-friendly codes. */
export function mapSignInError(error: unknown): AuthError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  let kind: AuthError["code"] = "unknown";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
    kind = "popup-closed";
  } else if (code.includes("popup-blocked")) {
    kind = "popup-blocked";
  } else if (code.includes("network") || code.includes("internal")) {
    kind = "network";
  } else if (code.includes("operation-not-supported") || code.includes("configuration")) {
    kind = "not-configured";
  }

  return { kind: "error", code: kind, message: FRIENDLY_MESSAGES[kind] };
}

async function postEstablishRole(
  desiredRole: SelfServeAccountRole,
  profile: { displayName?: string | null; photoURL?: string | null },
): Promise<
  | { ok: true; data: { status: "created" | "existing"; role: SelfServeAccountRole } }
  | { ok: false; conflictRole?: SelfServeAccountRole; retryable: boolean }
> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!auth || !currentUser) {
    return { ok: false, retryable: false };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/auth/establish-role", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        desiredRole,
        displayName: profile.displayName ?? null,
        photoURL: profile.photoURL ?? null,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        status: "created" | "existing";
        role: SelfServeAccountRole;
      };
      return { ok: true, data };
    }

    if (response.status === 409) {
      const data = (await response.json().catch(() => ({}))) as {
        role?: SelfServeAccountRole;
      };
      return { ok: false, conflictRole: data.role, retryable: false };
    }

    return { ok: false, retryable: response.status >= 500 };
  } catch {
    return { ok: false, retryable: true };
  }
}

/**
 * Signs the visitor in with Google and establishes their single application
 * role. The Firebase UID is looked up once server-side; a conflicting existing
 * role is returned instead of creating duplicate role data.
 */
export async function signInWithGoogleAndEstablishRole(
  desiredRole: SelfServeAccountRole,
): Promise<RoleOutcome> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { kind: "error", code: "not-configured", message: FRIENDLY_MESSAGES["not-configured"] };
  }

  let credential;
  try {
    const { signInWithPopup } = await import("firebase/auth");
    credential = await signInWithPopup(auth, googleProvider);
  } catch (error) {
    return mapSignInError(error);
  }

  const user = credential.user;
  const result = await postEstablishRole(desiredRole, {
    displayName: user.displayName,
    photoURL: user.photoURL,
  });

  if (!result.ok) {
    if (result.conflictRole) {
      // Leave the Firebase session intact so "Continue as <role>" works
      // without a second sign-in, but do not create conflicting data.
      persistAuthUser({
        uid: user.uid,
        name: user.displayName ?? undefined,
        email: user.email ?? undefined,
        photoURL: user.photoURL ?? undefined,
        role: result.conflictRole,
      });
      return { kind: "conflict", existingRole: result.conflictRole };
    }
    await auth.signOut().catch(() => undefined);
    clearStoredAuthUser();
    return {
      kind: "error",
      code: result.retryable ? "network" : "server",
      message: FRIENDLY_MESSAGES[result.retryable ? "network" : "server"],
    };
  }

  persistAuthUser({
    uid: user.uid,
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    photoURL: user.photoURL ?? undefined,
    role: result.data.role,
  });

  return {
    kind: "ok",
    status: result.data.status,
    role: result.data.role,
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  };
}

function persistAuthUser(user: {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  role?: SelfServeAccountRole;
}) {
  try {
    window.localStorage.setItem("bluehope.authUser", JSON.stringify(user));
  } catch {
    // Storage may be unavailable; session still works via Firebase.
  }
}