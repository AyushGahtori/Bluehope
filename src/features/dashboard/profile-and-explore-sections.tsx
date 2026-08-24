"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Card, Input, SectionTitle } from "@/components/ui/primitives";
import { ProfilePreview } from "@/features/dashboard/profile-preview";
import { authedApiHeaders, isConfigurationPendingResponse } from "@/lib/api-client";

type ProfileData = {
  name: string;
  tagline: string;
  bio: string;
  images: string[];
  services: string[];
  conditions: string[];
  weeklyHours: Record<string, { open: string; close: string } | null>;
  location: { text: string; source: string | null } | null;
  profileCompleteness: number;
  missingItems: string[];
};

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function useOwnProfile() {
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const headers = await authedApiHeaders();
        if (!headers) {
          if (!ignore) setState("ready");
          return;
        }
        const response = await fetch("/api/provider-profile", { headers, cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (ignore) return;
        if (response.ok && body && typeof body === "object") {
          setProfile((body as { profile?: ProfileData | null }).profile ?? null);
        } else if (isConfigurationPendingResponse(response.status, body)) {
          setProfile(null);
        }
      } catch {
        if (!ignore) setProfile(null);
      } finally {
        if (!ignore) setState("ready");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return { state, profile };
}

/**
 * "My Profile" — a read-only view of the account's own public profile,
 * loaded from the caller's own Firestore profile (ownerUid-scoped).
 */
export function MyProfileSection({
  role,
  editHref,
}: {
  role: "provider" | "institution";
  editHref: string;
}) {
  const { state, profile } = useOwnProfile();

  if (state === "loading") {
    return <div className="h-96 animate-pulse rounded-[8px] bg-slate-100" aria-busy="true" />;
  }

  if (!profile || profile.profileCompleteness === 0) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-950">Your profile is not set up yet</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Add your {role === "institution" ? "organization" : "practice"} details so families can
          discover you on BlueHope.
        </p>
        <Button className="mt-5" onClick={() => (window.location.href = editHref)}>
          Complete your profile
        </Button>
      </Card>
    );
  }

  const hoursEntries = Object.entries(profile.weeklyHours ?? {}).filter(
    (entry): entry is [string, { open: string; close: string }] => Boolean(entry[1]),
  );

  return (
    <div className="space-y-6">
      <ProfilePreview
        data={{
          name: profile.name,
          tagline: profile.tagline || (role === "institution" ? "Child development center" : "Independent provider"),
          bio: profile.bio || undefined,
          images: profile.images,
          services: profile.services,
          conditions: profile.conditions,
          openingHoursToday: hoursEntries[0]
            ? `${DAY_LABELS[hoursEntries[0][0]] ?? hoursEntries[0][0]} ${hoursEntries[0][1].open}–${hoursEntries[0][1].close}`
            : undefined,
          location: profile.location?.text || undefined,
          verificationStatus: "notRequested",
          completionPercent: profile.profileCompleteness,
          missingItems: profile.missingItems,
          editHref,
        }}
      />
      {hoursEntries.length > 0 ? (
        <Card className="p-6">
          <SectionTitle title="Opening hours" />
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {hoursEntries.map(([day, hours]) => (
              <li key={day} className="flex justify-between">
                <span>{DAY_LABELS[day] ?? day}</span>
                <span>
                  {hours.open} – {hours.close}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {profile.location ? (
        <Card className="p-6">
          <SectionTitle title="Location" />
          <p className="mt-2 text-sm text-slate-600">{profile.location.text}</p>
          <p className="mt-1 text-xs text-slate-400">
            {profile.location.source === "manual"
              ? "Entered manually — not GPS verified."
              : profile.location.source === "browser_geolocation"
                ? "Captured from your device location."
                : null}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Explore inside the authenticated dashboard shell. The sidebar and header
 * stay exactly as they are for the signed-in role — the user never feels
 * logged out. Search results open in the public marketplace.
 */
export function ExploreSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-950">Explore BlueHope</h1>
        <p className="mt-2 text-slate-600">
          See how families find support on BlueHope. Your dashboard and account stay signed in.
        </p>
      </div>
      <Card className="p-6">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams();
            if (query.trim()) params.set("q", query.trim());
            if (area.trim()) params.set("area", area.trim());
            params.set("radius", "20");
            router.push(`/search?${params.toString()}`);
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Service, therapy, condition or provider"
            aria-label="Search"
          />
          <Input
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder="Area (e.g. Andheri West, Mumbai)"
            aria-label="Area"
          />
          <Button type="submit" className="h-12">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </form>
      </Card>
      <Card className="bg-soft-blue p-6">
        <p className="font-bold text-bluehope">Why explore?</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Understanding how families search helps you complete the profile sections that matter
          most — services, conditions, and location — so your listing appears in the right results.
        </p>
      </Card>
    </div>
  );
}