import { Calendar, Clock, Heart, Languages, MapPin, Star } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Badge, Card } from "@/components/ui/primitives";
import { services } from "@/data/taxonomy";
import { openingSummary } from "@/data/marketplace";
import { formatDistance } from "@/lib/utils";
import type { ProviderSummary } from "@/types/domain";
import { LazyMapPreview } from "./lazy-map-preview";
import { ProfileActions } from "./profile-actions";
import { ProfileTabs } from "./profile-tabs";

const serviceNames = new Map(services.map((service) => [service.id, service.name]));

export function ProfilePage({ profile }: { profile: ProviderSummary }) {
  return (
    <div className="min-h-screen bg-white">
      <AppNav dashboard />
      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-7 text-sm text-slate-500">
            Home &gt; Search Results &gt; <span className="font-semibold text-slate-900">{profile.name}</span>
          </div>
          <Card className="p-6">
            <div className="grid gap-8 md:grid-cols-[360px_1fr]">
              <div className="min-h-80 rounded-[8px] bg-slate-100 p-5">
                <Badge tone="green">
                  {profile.verificationStatus === "review_ready" ? "Profile reviewed" : "Trust setup pending"}
                </Badge>
              </div>
              <div className="relative">
                <button className="absolute right-0 top-0 rounded-md bg-blue-50 p-3" aria-label="Save provider">
                  <Heart className="h-5 w-5" />
                </button>
                <h1 className="max-w-lg text-4xl font-extrabold leading-tight text-slate-950">{profile.name}</h1>
                <div className="mt-5 flex flex-wrap items-center gap-6 text-slate-600">
                  <span className="inline-flex items-center gap-2 text-amber-500">
                    <Star className="h-5 w-5 fill-current" />
                    {profile.rating}
                  </span>
                  <span>({profile.reviewCount} demo reviews)</span>
                  <span>{profile.yearsInService} years in service</span>
                </div>
                <p className="mt-6 text-lg text-slate-600">
                  {profile.services.map((id) => serviceNames.get(id) ?? id).join(", ")}
                </p>
                <div className="mt-7 grid gap-4 text-slate-600 sm:grid-cols-2">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-bluehope" />
                    {profile.location.formattedAddress}
                  </span>
                  <span className="font-semibold text-emerald-600">{formatDistance(profile.distanceKm)}</span>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {profile.modes.map((mode) => mode.replace("_", "-")).join(", ")}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    {profile.languages.join(", ")}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-8 max-w-4xl text-lg leading-8 text-slate-600">{profile.description}</p>
          </Card>

          <ProfileTabs profile={profile} />
        </section>

        <aside className="space-y-6" id="contact">
          <ProfileActions profile={profile} />
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-slate-200 p-3">
                <Clock className="h-5 w-5" />
              </span>
              <p className="font-semibold text-slate-700">Usually responds within 2-4 hours</p>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-5 font-bold text-emerald-600">
              {openingSummary("2026-09-22")}
            </div>
          </Card>
          <LazyMapPreview />
        </aside>
      </main>
    </div>
  );
}
