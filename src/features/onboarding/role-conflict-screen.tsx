"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { getFirebaseAuth } from "@/config/firebase";
import { clearStoredAuthUser } from "@/lib/auth-user-store";
import type { SelfServeAccountRole } from "@/models/firestore";

const ROLE_LABELS: Record<SelfServeAccountRole, string> = {
  customer: "Parent / Family Member",
  soleProvider: "Sole Provider",
  institution: "Institute / Organization",
};

const ROLE_ROUTES: Record<SelfServeAccountRole, string> = {
  customer: "/dashboard/parent",
  soleProvider: "/dashboard/provider",
  institution: "/dashboard/institute",
};

export function RoleConflictScreen({
  existingRole,
  email,
  onUseDifferentAccount,
}: {
  existingRole: SelfServeAccountRole;
  email?: string | null;
  onUseDifferentAccount?: () => void;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const continueAsExisting = () => {
    router.replace(ROLE_ROUTES[existingRole]);
  };

  const useDifferentAccount = async () => {
    setSwitching(true);
    try {
      const auth = getFirebaseAuth();
      await auth?.signOut().catch(() => undefined);
    } finally {
      clearStoredAuthUser();
      setSwitching(false);
      onUseDifferentAccount?.();
    }
  };

  return (
    <Card className="mx-auto w-full max-w-lg p-8 text-center shadow-[0_18px_40px_rgba(31,42,55,0.06)]">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#edf5ff]">
        <ShieldAlert className="h-7 w-7 text-[#2d7df6]" />
      </div>
      <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-950">
        You’re signing in as
      </h2>
      <p className="mt-3 text-lg font-semibold text-[#2d7df6] break-all">
        {email ?? "this email"}
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        This email is already registered as an{" "}
        <span className="font-semibold text-slate-900">
          {ROLE_LABELS[existingRole]}
        </span>{" "}
        on BlueHope.
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">
        Choose one of the options below to continue safely.
      </p>
      <div className="mt-7 flex flex-col gap-3">
        <Button onClick={continueAsExisting}>
          Continue to {ROLE_LABELS[existingRole]}
        </Button>
        <Button
          variant="outline"
          onClick={useDifferentAccount}
          disabled={switching}
        >
          {switching ? "Signing out…" : "Use another email"}
        </Button>
      </div>
    </Card>
  );
}
