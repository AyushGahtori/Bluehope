"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createAvatar } from "@dicebear/core";
import { loreleiNeutral } from "@dicebear/collection";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Trash2, UserRound } from "lucide-react";
import {
  BlueSelect,
  Button,
  Card,
  Input,
} from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import {
  authedApiHeaders,
  isConfigurationPendingResponse,
} from "@/lib/api-client";
import { getFirebaseAuth } from "@/config/firebase";
import { cn } from "@/lib/utils";

export type ChildProfile = {
  childId: string;
  relationship: "self" | "child" | "sibling" | "relative" | "other";
  firstName?: string;
  birthYear?: number;
  ageBand?: string;
  gender?: string;
  conditionIds: string[];
  supportNeedIds: string[];
  preferredServiceIds: string[];
};

const RELATIONSHIP_OPTIONS = [
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Relative" },
  { value: "other", label: "Other" },
];

const CONDITION_OPTIONS = conditions.map((condition) => ({
  value: condition.id,
  label: condition.name,
}));

const SERVICE_OPTIONS = services.map((service) => ({
  value: service.id,
  label: service.name,
}));

function labelFor(
  id: string,
  options: Array<{ value: string; label: string }>,
) {
  return options.find((option) => option.value === id)?.label ?? id;
}

async function childApiHeaders() {
  const immediate = await authedApiHeaders();
  if (immediate) return immediate;

  const auth = getFirebaseAuth();
  if (!auth) return null;

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve();
    }, 4000);
    const unsubscribe = onAuthStateChanged(auth, () => {
      window.clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
  });

  return authedApiHeaders();
}

export function childAge(child: ChildProfile) {
  if (child.birthYear) {
    const age = new Date().getFullYear() - child.birthYear;
    if (age >= 0 && age < 120) return `${age} years old`;
  }
  return child.ageBand || "Age not added";
}

export function childDisplayName(child: ChildProfile) {
  return child.firstName?.trim() || "Child profile";
}

export function primaryChildContext(child: ChildProfile | null) {
  if (!child) return "Add a child profile";
  const service = child.preferredServiceIds[0]
    ? labelFor(child.preferredServiceIds[0], SERVICE_OPTIONS)
    : "support";
  return `${childDisplayName(child)} · ${service}`;
}

export function ChildAvatar({
  child,
  className,
}: {
  child: ChildProfile;
  className?: string;
}) {
  const avatar = useMemo(() => {
    const svg = createAvatar(loreleiNeutral, {
      seed: child.childId || child.firstName || "bluehope-child",
      backgroundColor: ["dbeafe", "dcfce7", "fae8ff", "fef3c7"],
      radius: 50,
    }).toString();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [child.childId, child.firstName]);

  return (
    <Image
      src={avatar}
      alt=""
      width={80}
      height={80}
      unoptimized
      className={cn("rounded-full bg-blue-50 object-cover", className)}
    />
  );
}

export function ChildProfileCard({
  child,
  compact = false,
  onDelete,
}: {
  child: ChildProfile;
  compact?: boolean;
  onDelete?: (childId: string) => void;
}) {
  const conditionLabels = child.conditionIds
    .slice(0, compact ? 1 : 3)
    .map((id) => labelFor(id, CONDITION_OPTIONS));
  const serviceLabels = child.preferredServiceIds
    .slice(0, compact ? 1 : 3)
    .map((id) => labelFor(id, SERVICE_OPTIONS));

  return (
    <div className="bluehope-lift flex items-center gap-4 rounded-[8px] border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/50">
      <ChildAvatar child={child} className={compact ? "h-16 w-16" : "h-20 w-20"} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-950">{childDisplayName(child)}</p>
        <p className="mt-1 text-sm text-slate-600">{childAge(child)}</p>
        <p className="mt-1 text-sm text-slate-600">
          {[...conditionLabels, ...serviceLabels].join(" · ") ||
            "Support needs not added"}
        </p>
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(child.childId)}
          aria-label={`Remove ${childDisplayName(child)}`}
          className="bluehope-lift rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function useChildProfiles(enabled = true) {
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [error, setError] = useState("");

  const loadChildren = useCallback(async () => {
    if (!enabled) {
      setChildren([]);
      return;
    }

    setError("");
    const headers = await childApiHeaders();
    if (!headers) {
      setChildren([]);
      return;
    }

    try {
      const response = await fetch("/api/children", {
        headers,
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok && body && typeof body === "object") {
        const data = body as { children?: ChildProfile[] };
        setChildren(Array.isArray(data.children) ? data.children : []);
        return;
      }
      if (isConfigurationPendingResponse(response.status, body)) {
        setChildren([]);
        setError("Child profiles need Firebase Admin to be configured.");
        return;
      }
      setChildren([]);
      setError("We couldn't load child profiles. Please try again.");
    } catch {
      setChildren([]);
      setError("We couldn't load child profiles. Please try again.");
    }
  }, [enabled]);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      loadChildren().catch(() => {
        if (!ignore) {
          setChildren([]);
          setError("We couldn't load child profiles. Please try again.");
        }
      });
    });
    return () => {
      ignore = true;
    };
  }, [loadChildren]);

  return { children, error, refresh: loadChildren };
}

export function AddChildForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [relationship, setRelationship] = useState("child");
  const [conditionIds, setConditionIds] = useState<string[]>(["autism"]);
  const [preferredServiceIds, setPreferredServiceIds] = useState<string[]>([
    "speech-therapy",
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const birthYear =
    age.trim() && Number.isFinite(Number(age))
      ? new Date().getFullYear() - Number(age)
      : undefined;

  const toggle = (
    id: string,
    values: string[],
    setter: (nextValues: string[]) => void,
  ) => {
    setter(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  };

  const submit = async () => {
    if (!firstName.trim()) {
      setError("Child name is required.");
      return;
    }
    if (!birthYear) {
      setError("Age is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const headers = await childApiHeaders();
      if (!headers) {
        setError("Please sign in again before adding a child profile.");
        return;
      }
      const response = await fetch("/api/children", {
        method: "POST",
        headers,
        body: JSON.stringify({
          relationship,
          firstName: firstName.trim(),
          birthYear,
          ageBand: `${age.trim()} years`,
          conditionIds,
          supportNeedIds: conditionIds,
          preferredServiceIds,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok) {
        onCreated();
        return;
      }
      if (isConfigurationPendingResponse(response.status, body)) {
        setError("Child profiles need Firebase Admin to be configured.");
      } else {
        setError("We couldn't add this child profile. Please try again.");
      }
    } catch {
      setError("We couldn't add this child profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-blue-100 bg-blue-50/60 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-slate-700">
            Child name
          </span>
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            className="mt-2"
          />
        </label>
        <label>
          <span className="text-sm font-semibold text-slate-700">Age</span>
          <Input
            value={age}
            type="number"
            min={0}
            max={40}
            onChange={(event) => setAge(event.target.value)}
            placeholder="Age"
            className="mt-2"
          />
        </label>
        <label>
          <span className="text-sm font-semibold text-slate-700">
            Relationship
          </span>
          <BlueSelect
            value={relationship}
            onChange={setRelationship}
            placeholder="Select relationship"
            options={RELATIONSHIP_OPTIONS}
            className="mt-2"
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Conditions or support needs
        </p>
        <div className="flex flex-wrap gap-2">
          {CONDITION_OPTIONS.slice(0, 10).map((condition) => (
            <ChoiceChip
              key={condition.value}
              selected={conditionIds.includes(condition.value)}
              onClick={() =>
                toggle(condition.value, conditionIds, setConditionIds)
              }
            >
              {condition.label}
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Preferred support
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_OPTIONS.slice(0, 8).map((service) => (
            <ChoiceChip
              key={service.value}
              selected={preferredServiceIds.includes(service.value)}
              onClick={() =>
                toggle(service.value, preferredServiceIds, setPreferredServiceIds)
              }
            >
              {service.label}
            </ChoiceChip>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={saving} onClick={() => void submit()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Adding..." : "Add child"}
        </Button>
      </div>
    </Card>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={selected}
      className={cn(
        "bluehope-fill bluehope-lift rounded-full border px-3 py-2 text-sm font-semibold transition hover:text-white",
        selected
          ? "border-bluehope text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
      )}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function ChildrenEmptyState() {
  return (
    <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center">
      <UserRound className="mx-auto h-8 w-8 text-bluehope" />
      <p className="mt-3 font-bold text-slate-950">No child profiles yet</p>
      <p className="mt-1 text-sm text-slate-600">
        Add a child profile so recommendations can match their age and support
        needs. Child details stay private.
      </p>
    </div>
  );
}
