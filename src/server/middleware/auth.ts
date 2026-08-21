import "server-only";
import type { NextRequest } from "next/server";
import { getAdminAuth } from "@/server/firebase/admin";
import type { AccountRole } from "@/models/firestore";

export type AuthContext = {
  authenticated: boolean;
  firebaseUid?: string;
  email?: string;
  role?: AccountRole;
  claims?: Record<string, unknown>;
  reason?: string;
};

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { authenticated: false, reason: "missing_bearer_token" };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return { authenticated: false, reason: "firebase_admin_not_configured" };
  }

  try {
    const token = authorization.slice("Bearer ".length);
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    const roleClaim = decodedToken.role;
    const role = typeof roleClaim === "string" ? (roleClaim as AccountRole) : undefined;

    return {
      authenticated: true,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      role,
      claims: decodedToken,
    };
  } catch (error) {
    return {
      authenticated: false,
      reason: error instanceof Error ? error.message : "invalid_firebase_token",
    };
  }
}

export function protectedPendingResponse(context: AuthContext) {
  return Response.json(
    {
      status: "configuration_required",
      message:
        context.reason === "firebase_admin_not_configured"
          ? "This protected endpoint requires Firebase Admin credentials before it can read or write private data."
          : "This protected endpoint requires a valid Firebase ID token.",
      reason: context.reason,
    },
    { status: context.reason === "firebase_admin_not_configured" ? 501 : 401 },
  );
}

export function requireRole(context: AuthContext, roles: AccountRole[]) {
  if (!context.authenticated) return false;
  if (roles.length === 0) return true;
  if (context.role && roles.includes(context.role)) return true;
  return context.role === "admin";
}
