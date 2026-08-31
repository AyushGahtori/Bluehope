"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * SSO callback handler — required by Clerk's authenticateWithRedirect API.
 *
 * When a user clicks "Continue with Google" in the onboarding flow, Clerk
 * redirects through this page to complete the OAuth token exchange.
 * After exchange, Clerk redirects to the `redirectUrlComplete` that was
 * passed when initiating the OAuth flow (e.g. /onboarding/parent).
 */
export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-soft-blue">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-bluehope" />
        <p className="text-sm text-slate-500">Completing sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
