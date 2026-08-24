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
  institution: "Institute",
};

const ROLE_ROUTES: Record<SelfServeAccountRole, string> = {
  customer: "/dashboard/parent",
  soleProvider: "/dashboard/provider",
  institution: "/dashboard/institute",
};

export function RoleConflictScreen({
  existingRole,
  onUseDifferentAccount,
}: {
  existingRole: SelfServeAccountRole;
  onUseDifferentAccount?: () => void;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const continueAsExisting = () => {
    router.push(ROLE_ROUTES[existingRole]);
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
    <Card className="mx-auto w-full max-w-lg p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
        <ShieldAlert className="h-7 w-7 text-bluehope" />
      </div>
      <h2 className="text-xl font-bold text-slate-950">Account already registered</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This Google account is already registered as a{" "}
        <span className="font-semibold text-slate-900">{ROLE_LABELS[existingRole]}</span> account.
        BlueHope accounts currently support one primary role per account.
      </p>
      <div className="mt-7 flex flex-col gap-3">
        <Button onClick={continueAsExisting}>
          Continue as {ROLE_LABELS[existingRole]}
        </Button>
        <Button variant="outline" onClick={useDifferentAccount} disabled={switching}>
          {switching ? "Signing out…" : "Use a different Google account"}
        </Button>
      </div>
    </Card>
  );
}