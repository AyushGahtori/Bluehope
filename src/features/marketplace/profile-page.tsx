import { Calendar, Clock, Heart, Languages, MapPin, Star } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Badge, Card, SectionTitle } from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import { formatDistance } from "@/lib/utils";
import type { ProviderSummary } from "@/types/domain";
import { MapPreview } from "./map-preview";
import { ProfileActions } from "./profile-actions";

const serviceNames = new Map(services.map((service) => [service.id, service.name]));
const conditionNames = new Map(conditions.map((condition) => [condition.id, condition.name]));

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

          <div className="mt-10 grid grid-cols-4 border-b border-slate-200 text-sm font-semibold text-slate-600">
            {["About", "Reviews", "Gallery", "Q&A"].map((tab, index) => (
              <div key={tab} className={index === 0 ? "border-b-2 border-bluehope py-4 text-bluehope" : "py-4"}>
                {tab}
              </div>
            ))}
          </div>

          <Card className="mt-6 p-7">
            <SectionTitle title={`About the ${profile.providerType === "institute" ? "Institute" : "Provider"}`} />
            <p className="text-slate-600">
              {profile.name} works with families through structured, parent-friendly plans. Public profile data is
              intentionally limited to professional and business information; private child and identity records stay
              protected.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {profile.conditions.map((id) => (
                <Badge key={id} tone="blue">
                  {conditionNames.get(id) ?? id}
                </Badge>
              ))}
            </div>
          </Card>
        </section>

        <aside className="space-y-6" id="contact">
          <ProfileActions providerName={profile.name} />
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-slate-200 p-3">
                <Clock className="h-5 w-5" />
              </span>
              <p className="font-semibold text-slate-700">Usually responds within 2-4 hours</p>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-5 font-bold text-emerald-600">
              Open today: 9:00 AM - 7:00 PM
            </div>
          </Card>
          <MapPreview />
        </aside>
      </main>
    </div>
  );
}
