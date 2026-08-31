"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

/**
 * Client-side handshake for the development-server boot ID.
 *
 * When `next dev` restarts, the cookie the browser still holds no longer
 * matches the running Node process. Without intervention the user sees a
 * stale session: UI thinks they're logged in but every server-side check
 * fails. This component runs once on app mount, asks the server whether
 * the current cookie is still valid, and if not, refreshes the cookie,
 * signs the user out of Clerk, and bounces them to /sign-in so they can
 * re-authenticate cleanly.
 *
 * In production this entire check short-circuits to `valid: true`, so the
 * component is effectively a no-op for real users.
 */
export function DevSessionBootstrap() {
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    let cancelled = false;

    async function reconcile() {
      try {
        const check = await fetch("/api/auth/dev-session", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        if (cancelled) return;
        if (check.ok) {
          const data = (await check.json()) as {
            valid?: boolean;
            reason?: string;
          };
          if (data.valid !== false) return;
        }

        // Dev server restarted (or cookie missing). Refresh the cookie so
        // subsequent requests succeed; if Clerk thinks we're still signed
        // in from the previous process, force a fresh sign-in.
        await fetch("/api/auth/dev-session", {
          method: "POST",
          credentials: "include",
        }).catch(() => null);

        if (isLoaded && isSignedIn) {
          try {
            await clerk.signOut({ redirectUrl: "/sign-in" });
            router.replace("/sign-in");
            return;
          } catch {
            // Fall through to a plain redirect.
          }
        }

        router.replace(
          `/sign-in?reason=${encodeURIComponent("dev_restart")}`,
        );
      } catch {
        // Network failure during bootstrap is non-fatal — keep the user
        // on the page so the next navigation can try again.
      }
    }

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [clerk, router, isLoaded, isSignedIn]);

  return null;
}