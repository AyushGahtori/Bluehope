/**
 * Single source of truth for the mapping between BlueHope application roles
 * and their dashboard routes. Every role-aware navigation decision (logo link,
 * sidebar links, role guards, redirects) must use these helpers instead of
 * hardcoding dashboard paths.
 */

export type DashboardRole = "parent" | "provider" | "institution" | "admin";

/** Application-level role stored on users/{uid} (Firebase UID keyed). */
export type AccountRole = "customer" | "soleProvider" | "institution";

export const ROLE_DASHBOARD: Record<DashboardRole, string> = {
  parent: "/dashboard/parent",
  provider: "/dashboard/provider",
  institution: "/dashboard/institute",
  admin: "/dashboard/admin",
};

export const ACCOUNT_ROLE_DASHBOARD: Record<AccountRole, string> = {
  customer: ROLE_DASHBOARD.parent,
  soleProvider: ROLE_DASHBOARD.provider,
  institution: ROLE_DASHBOARD.institution,
};

export const ACCOUNT_ROLE_LABEL: Record<AccountRole, string> = {
  customer: "Parent / Family Member",
  soleProvider: "Sole Provider",
  institution: "Institute / Organization",
};

export function dashboardRoleForAccountRole(role: AccountRole): DashboardRole {
  if (role === "customer") return "parent";
  if (role === "soleProvider") return "provider";
  if (role === "institution") return "institution";
  return "parent";
}

/** Resolves the canonical dashboard home for a dashboard role segment. */
export function dashboardHomeFor(role: DashboardRole): string {
  return ROLE_DASHBOARD[role] ?? ROLE_DASHBOARD.parent;
}

/**
 * Parses a /dashboard/{role}/... pathname and returns the role segment, or
 * null when the path is not a role dashboard route.
 */
export function dashboardRoleFromPath(pathname: string): DashboardRole | null {
  const match = /^\/dashboard\/(parent|provider|institution|admin)(?:\/|$)/.exec(pathname);
  return match ? (match[1] as DashboardRole) : null;
}