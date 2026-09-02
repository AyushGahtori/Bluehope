"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  Bell,
  CalendarCheck,
  FileText,
  Heart,
  Home,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Users,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { getFirebaseAuth } from "@/config/firebase";
import {
  clearStoredAuthUser,
  useStoredAuthUser,
  writeStoredAuthUser,
} from "@/lib/auth-user-store";
import {
  dashboardHomeFor,
  ROLE_DASHBOARD,
  type AccountRole,
  type DashboardRole,
} from "@/lib/role-routing";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: Home,
  Search: Search,
  "Saved Providers": Heart,
  "My Enquiries": ShieldCheck,
  Appointments: CalendarCheck,
  Messages: MessageSquare,
  Notifications: Bell,
  Resources: FileText,
  "My Children": Users,
  "Profile Settings": Settings,
  "My Profile": Search,
  Services: Heart,
  Enquiries: CalendarCheck,
  Inquiries: Mail,
  "Reviews & Ratings": Star,
  Gallery: ImageIcon,
  Availability: CalendarCheck,
  Explore: Search,
  "Q&A": HelpCircle,
  "Edit Profile": Pencil,
  Verify: ShieldCheck,
  Users,
  Providers: Users,
  "Services & Categories": Search,
  Reports: FileText,
  Settings,
} as const;

const parentLinks: Record<string, string> = {
  Dashboard: "/dashboard/parent",
  Search: "/dashboard/parent/search",
  "Saved Providers": "/dashboard/parent/saved",
  "My Enquiries": "/dashboard/parent/enquiries",
  Appointments: "/dashboard/parent/appointments",
  Messages: "/dashboard/parent/messages",
  Notifications: "/dashboard/parent/notifications",
  Resources: "/dashboard/parent/resources",
  "My Children": "/dashboard/parent/children",
  "Profile Settings": "/dashboard/parent/settings",
};

const providerLinks: Record<string, string> = {
  Dashboard: "/dashboard/provider",
  "My Profile": "/dashboard/provider/profile",
  Explore: "/dashboard/provider/explore",
  Inquiries: "/dashboard/provider/enquiries",
  Appointments: "/dashboard/provider/appointments",
  "Reviews & Ratings": "/dashboard/provider/reviews",
  Messages: "/dashboard/provider/messages",
  "Q&A": "/dashboard/provider/qa",
  "Edit Profile": "/dashboard/provider/edit-profile",
  Verify: "/dashboard/provider/verify",
};

const instituteLinks: Record<string, string> = {
  Dashboard: "/dashboard/institute",
  "My Profile": "/dashboard/institute/profile",
  Explore: "/dashboard/institute/explore",
  Inquiries: "/dashboard/institute/enquiries",
  Appointments: "/dashboard/institute/appointments",
  "Reviews & Ratings": "/dashboard/institute/reviews",
  Messages: "/dashboard/institute/messages",
  "Q&A": "/dashboard/institute/qa",
  "Edit Profile": "/dashboard/institute/edit-profile",
  Verify: "/dashboard/institute/verify",
};

const adminLinks: Record<string, string> = {
  Dashboard: "/dashboard/admin",
  Users: "/dashboard/admin/users",
  Providers: "/dashboard/admin/providers",
  "Services & Categories": "/dashboard/admin/services",
  Enquiries: "/dashboard/admin/enquiries",
  Appointments: "/dashboard/admin/appointments",
  "Reviews & Ratings": "/dashboard/admin/reviews",
  Messages: "/dashboard/admin/messages",
  Reports: "/dashboard/admin/reports",
  Settings: "/dashboard/admin/settings",
};

function navHref(item: string, role: DashboardRole) {
  const links =
    role === "parent"
      ? parentLinks
      : role === "admin"
        ? adminLinks
        : role === "institution"
          ? instituteLinks
          : providerLinks;
  return links[item] ?? dashboardHomeFor(role);
}

/**
 * Auth-aware route guard. The URL role segment is never trusted: the guard
 * resolves the account's authoritative role (stored role, confirmed against
 * users/{uid} via /api/account/session when needed) and redirects to the correct
 * dashboard when the route does not match. Content is blocked while checking
 * so a mismatched URL never flashes another role's dashboard.
 */
function useRoleGuard(expectedRole: DashboardRole) {
  const router = useRouter();
  const authUser = useStoredAuthUser();
  const [state, setState] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    let cancelled = false;

    const persistRole = (role: AccountRole) => {
      try {
        const raw = window.localStorage.getItem("bluehope.authUser");
        const stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        window.localStorage.setItem(
          "bluehope.authUser",
          JSON.stringify({ ...stored, role }),
        );
      } catch {
        // Storage unavailable; the in-memory check below still applies.
      }
    };

    const redirectFor = (role: AccountRole) => {
      const dashboardRole =
        role === "customer"
          ? "parent"
          : role === "soleProvider"
            ? "provider"
            : "institution";
      return dashboardRole === expectedRole
        ? null
        : ROLE_DASHBOARD[dashboardRole];
    };

    async function verify() {
      const auth = getFirebaseAuth();
      let user = auth?.currentUser ?? null;

      // Wait briefly for Firebase auth to restore the session on hard reloads.
      if (!user && auth) {
        user = await new Promise<User | null>((resolve) => {
          const timeout = window.setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 4000);
          const unsubscribe = onAuthStateChanged(auth, (current) => {
            window.clearTimeout(timeout);
            unsubscribe();
            resolve(current);
          });
        });
      }

      if (cancelled) return;
      if (!user) {
        router.replace("/");
        return;
      }

      let role = authUser?.role;
      let serverConfirmedNoRole = false;
      if (!role) {
        // No locally known role: ask the server for the authoritative answer.
        try {
          const token = await user.getIdToken();
          const response = await fetch("/api/account/session", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = (await response.json()) as {
              role?: AccountRole | null;
            };
            if (data.role) {
              role = data.role;
              persistRole(data.role);
            } else {
              // The server authoritatively resolved the account and found no
              // application role. Never let a role-less account browse any
              // role dashboard by URL.
              serverConfirmedNoRole = true;
            }
          }
        } catch {
          // Network failure: fall through to the stored-role check.
        }
      }

      if (cancelled) return;

      if (role) {
        const redirect = redirectFor(role);
        if (redirect) {
          router.replace(redirect);
          return;
        }
        setState("allowed");
        return;
      }

      if (serverConfirmedNoRole) {
        // Account exists without a role: send the user to the public home
        // page where they can pick a role and complete onboarding.
        router.replace("/");
        return;
      }

      // Role could not be verified (offline / backend not configured yet).
      // Allow the shell rather than locking the user out of a fresh account;
      // every data request remains scoped server-side regardless.
      setState("allowed");
    }

    void verify();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedRole, router]);

  return state;
}

export function DashboardShell({
  children,
  nav,
  roleLabel,
  role,
  searchHeader,
}: {
  children: ReactNode;
  nav: string[];
  roleLabel: string;
  role?: DashboardRole;
  searchHeader?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const authUser = useStoredAuthUser();

  useEffect(() => {
    let cancelled = false;

    const syncStoredIdentity = async () => {
      const auth = getFirebaseAuth();
      const user = auth?.currentUser;
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/account/session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as {
          displayName?: string | null;
          email?: string | null;
          role?: AccountRole | null;
          uid?: string | null;
        };

        const nextName =
          data.displayName ||
          data.email?.split("@")[0] ||
          user.displayName ||
          "";
        const nextUser = {
          uid: user.uid,
          name: nextName || undefined,
          email: data.email || user.email || undefined,
          photoURL: user.photoURL || authUser?.photoURL || undefined,
          role: data.role || authUser?.role,
        };

        const currentSignature = JSON.stringify({
          uid: authUser?.uid,
          name: authUser?.name,
          email: authUser?.email,
          photoURL: authUser?.photoURL,
          role: authUser?.role,
        });
        const nextSignature = JSON.stringify(nextUser);

        if (!cancelled && currentSignature !== nextSignature) {
          writeStoredAuthUser(nextUser);
        }
      } catch {
        // Ignore refresh failures; stale local data is already better than a
        // blank dashboard, and the server remains the authoritative source.
      }
    };

    void syncStoredIdentity();
    return () => {
      cancelled = true;
    };
  }, [
    authUser?.uid,
    authUser?.email,
    authUser?.name,
    authUser?.photoURL,
    authUser?.role,
  ]);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen && !sidebarOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuOpen && !menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, sidebarOpen]);

  const resolvedRole =
    role ??
    (roleLabel.includes("Admin")
      ? "admin"
      : roleLabel.toLowerCase().includes("institut")
        ? "institution"
        : roleLabel.toLowerCase().includes("dr.")
          ? "provider"
          : "parent");
  const homeHref = dashboardHomeFor(resolvedRole);
  const searchAction =
    resolvedRole === "parent" ? "/dashboard/parent/search" : "/search";

  // Guard every dashboard route: URL role segments are never authoritative.
  const guardState = useRoleGuard(resolvedRole);

  const storedName = authUser?.name?.trim();
  const headerLabel = storedName
    ? `Hi, ${storedName.split(" ")[0]}`
    : roleLabel;
  const avatarInitial = storedName ? storedName.charAt(0).toUpperCase() : null;

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setMenuOpen(false);
    setSidebarOpen(false);
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth).catch(() => null);
    }
    clearStoredAuthUser();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile / Tablet overlay backdrop */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Unified sidebar implementation: drawer on mobile/tablet, fixed sidebar on desktop */}
      <aside
        className={cn(
          "bluehope-enter fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-slate-200 bg-slate-50 px-8 py-9 transition-transform duration-200 ease-in-out lg:z-30 lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <BlueHopeLogo href={homeHref} />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Scrollable nav area: no item can ever be covered by the help card. */}
        <nav className="mt-10 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
          {nav.map((item) => {
            const Icon = iconMap[item as keyof typeof iconMap] ?? FileText;
            const href = navHref(item, resolvedRole);
            const active =
              pathname === href ||
              (href !== homeHref && pathname.startsWith(href));
            return (
              <Link
                key={item}
                href={href}
                onClick={() => setSidebarOpen(false)}
                data-active={active}
                className={cn(
                  "bluehope-fill bluehope-lift flex h-14 shrink-0 items-center gap-4 rounded-[8px] border border-transparent px-5 text-base font-medium text-slate-600 transition hover:bg-blue-50",
                  active && "border-bluehope text-white shadow-card",
                )}
              >
                <Icon className="h-6 w-6" />
                <span>{item}</span>
              </Link>
            );
          })}
        </nav>
        <div className="bluehope-lift mt-4 shrink-0 rounded-[8px] border border-blue-100 bg-blue-50 p-5">
          <p className="font-bold text-slate-950">Need Help?</p>
          <p className="mt-1 text-sm text-slate-600">
            Our support team is here to assist you.
          </p>
        </div>
      </aside>

      <main className="lg:pl-80">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:gap-6">
            {/* Search area with responsive hamburger icon on smaller screens */}
            <div className="flex flex-1 max-w-4xl items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label="Toggle navigation menu"
                aria-expanded={sidebarOpen}
                className="bluehope-lift flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-bluehope hover:bg-blue-50 hover:text-bluehope lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              {searchHeader ? (
                searchHeader
              ) : (
                <form
                  action={searchAction}
                  className="bluehope-focus-glow flex h-12 flex-1 items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm text-slate-500 transition hover:border-blue-200 focus-within:border-bluehope focus-within:ring-4 focus-within:ring-blue-100"
                >
                  <Search className="h-5 w-5 shrink-0" />
                  <input
                    name="q"
                    className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-500"
                    placeholder="Search by service, therapy, condition or provider"
                  />
                </form>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <Link
                href={navHref("Notifications", resolvedRole)}
                aria-label="Notifications"
                className="bluehope-lift hidden rounded-full p-2 text-slate-700 transition hover:bg-blue-50 hover:text-bluehope sm:block"
              >
                <Bell className="h-6 w-6" />
              </Link>
              {resolvedRole === "parent" ? (
                <Link
                  href={navHref("Saved Providers", resolvedRole)}
                  aria-label="Saved providers"
                  className="bluehope-lift hidden rounded-full p-2 text-slate-700 transition hover:bg-blue-50 hover:text-bluehope sm:block"
                >
                  <Heart className="h-6 w-6" />
                </Link>
              ) : null}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="bluehope-lift flex items-center gap-2 sm:gap-3 rounded-full border border-blue-100 bg-blue-50 py-1 pl-1.5 pr-2.5 sm:py-1.5 sm:pl-2 sm:pr-4 text-left transition hover:border-bluehope hover:bg-blue-100"
                >
                  {authUser?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={authUser.photoURL}
                      alt=""
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-200 text-xs sm:text-sm font-bold text-slate-600">
                      {avatarInitial ?? ""}
                    </span>
                  )}
                  <span className="hidden sm:block text-sm">
                    <span className="block font-semibold text-bluehope">
                      {headerLabel}
                    </span>
                    <span className="block text-xs text-slate-500">
                      BlueHope
                    </span>
                  </span>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="bluehope-enter absolute right-0 top-full z-50 mt-2 w-52 rounded-[12px] border border-blue-100 bg-white p-2 shadow-soft"
                  >
                    <Link
                      href={homeHref}
                      className="block rounded-[10px] px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50"
                    >
                      Home
                    </Link>
                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      {loggingOut ? "Logging out..." : "Log out"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {guardState === "checking" ? (
            <div
              className="space-y-4"
              aria-busy="true"
              aria-label="Verifying your account"
            >
              <div className="h-10 w-72 animate-pulse rounded-[8px] bg-slate-100" />
              <div className="h-40 animate-pulse rounded-[8px] bg-slate-100" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
