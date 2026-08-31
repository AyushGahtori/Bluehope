import "server-only";

/**
 * Ephemeral development server session tracking.
 *
 * In local development (process.env.NODE_ENV !== "production"), a unique boot ID
 * is generated when the dev server starts up and held only in Node.js process memory.
 *
 * When the dev server is restarted, the previous boot ID is lost. Any client
 * requests carrying an older boot ID cookie (or missing it) are recognized as
 * belonging to a previous development session and invalidated, requiring the
 * developer/tester to sign in fresh.
 *
 * In production, this entire mechanism is disabled.
 */

export const DEV_BOOT_COOKIE_NAME = "bluehope_dev_boot_id";

// Ephemeral ID unique to this running Node process in dev
const DEV_SERVER_BOOT_ID =
  process.env.NODE_ENV !== "production"
    ? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    : "prod";

export function getDevServerBootId(): string {
  return DEV_SERVER_BOOT_ID;
}

export function isDevBootIdValid(cookieValue?: string | null): boolean {
  if (process.env.NODE_ENV === "production") return true;
  if (!cookieValue) return false;
  return cookieValue.trim() === DEV_SERVER_BOOT_ID;
}
