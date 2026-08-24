"use client";

import { useStoredAuthUser } from "@/lib/auth-user-store";

export function UserGreeting({ fallback = "Welcome back!" }: { fallback?: string }) {
  const authUser = useStoredAuthUser();
  const name = authUser?.name?.trim();
  const firstName = name ? name.split(" ")[0] : null;

  return (
    <h1 className="text-4xl font-extrabold text-slate-950">
      {firstName ? `Welcome back, ${firstName}!` : fallback}
    </h1>
  );
}

export function StoredNameField({ className }: { className?: string }) {
  const authUser = useStoredAuthUser();
  const storedName = authUser?.name?.trim() ?? "";

  // Remount when the stored name arrives so the uncontrolled input picks it up.
  return (
    <input
      key={storedName || "empty"}
      className={className}
      defaultValue={storedName}
      placeholder="Your full name"
    />
  );
}