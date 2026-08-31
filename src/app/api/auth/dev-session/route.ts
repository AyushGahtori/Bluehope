import type { NextRequest } from "next/server";
import {
  DEV_BOOT_COOKIE_NAME,
  getDevServerBootId,
  isDevBootIdValid,
} from "@/server/dev-session";

/**
 * GET /api/auth/dev-session
 * Checks if the current browser's development session boot ID matches the server's running process.
 * In production, always returns { valid: true }.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ valid: true });
  }

  const cookie = request.cookies.get(DEV_BOOT_COOKIE_NAME)?.value;
  const valid = isDevBootIdValid(cookie);

  return Response.json({
    valid,
    reason: valid ? undefined : "dev_restart",
  });
}

/**
 * POST /api/auth/dev-session
 * Sets/refreshes the ephemeral dev boot ID cookie on the client after explicit login.
 */
export async function POST() {
  const bootId = getDevServerBootId();
  const response = Response.json({ status: "ok", bootId });

  if (process.env.NODE_ENV !== "production") {
    response.headers.append(
      "Set-Cookie",
      `${DEV_BOOT_COOKIE_NAME}=${bootId}; Path=/; SameSite=Lax; HttpOnly`,
    );
  }

  return response;
}
