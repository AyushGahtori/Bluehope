import "server-only";
import type { NextRequest } from "next/server";

export type AuthContext = {
  authenticated: boolean;
  firebaseUid?: string;
  reason?: string;
};

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { authenticated: false, reason: "missing_bearer_token" };
  }

  if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    return { authenticated: false, reason: "firebase_admin_not_configured" };
  }

  return {
    authenticated: false,
    reason: "firebase_admin_verification_pending",
  };
}

export function protectedPendingResponse(context: AuthContext) {
  return Response.json(
    {
      status: "configuration_required",
      message:
        "This protected endpoint is wired for Firebase ID-token verification and MongoDB persistence, but server credentials are not configured yet.",
      reason: context.reason,
    },
    { status: 501 },
  );
}
