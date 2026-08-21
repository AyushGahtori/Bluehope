import { SlidersHorizontal } from "lucide-react";
import { AppNav } from "@/components/layout/app-nav";
import { Badge, Card, Input, LinkButton, Select } from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import { searchProviders, type SearchParams } from "@/services/search-service";
import { MapPreview } from "./map-preview";
import { ProviderCard } from "./provider-card";

export function SearchResultsPage({ params }: { params: SearchParams }) {
  const results = searchProviders(params);

  return (
    <div className="min-h-screen bg-white">
      <AppNav />
      <form className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_220px_140px]">
          <Input name="q" defaultValue={params.q} placeholder="Search Therapy" />
          <Input name="location" defaultValue="Andheri West, Mumbai" placeholder="Location" />
          <button className="h-12 rounded-lg bg-bluehope text-sm font-semibold text-white">Search</button>
        </div>
      </form>
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[280px_1fr_410px]">
        <Card className="h-fit p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Filters</h2>
            <LinkButton href="/search" variant="ghost" className="h-auto px-0">
              Clear All
            </LinkButton>
          </div>
          <div className="space-y-5 text-sm">
            <label className="block">
              <span className="font-semibold">Distance</span>
              <Select name="radius" defaultValue={String(params.radius ?? 10)} className="mt-2">
                {[1, 5, 10, 20, 50, 100].map((radius) => (
                  <option key={radius} value={radius}>
                    Within {radius} km
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="font-semibold">Service Type</span>
              <Select name="service" defaultValue={params.service ?? ""} className="mt-2">
                <option value="">Any service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="font-semibold">Condition</span>
              <Select name="condition" defaultValue={params.condition ?? ""} className="mt-2">
                <option value="">Any condition</option>
                {conditions.map((condition) => (
                  <option key={condition.id} value={condition.id}>
                    {condition.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="font-semibold">Sort</span>
              <Select name="sort" defaultValue={params.sort ?? "most-relevant"} className="mt-2">
                <option value="most-relevant">Most Relevant</option>
                <option value="nearest">Nearest</option>
                <option value="highest-rated">Highest Rated</option>
                <option value="most-experienced">Most Experienced</option>
              </Select>
            </label>
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-bluehope text-sm font-semibold text-bluehope">
              More Filters <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </Card>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-950">
                {results.total} Providers found for <span className="text-bluehope">{params.q ?? "Speech Therapy"}</span>
              </h1>
              <div className="mt-4 flex flex-wrap gap-3">
                {(params.q ? [params.q] : ["Speech Therapy"]).map((chip) => (
                  <Badge key={chip} tone="neutral">
                    {chip}
                  </Badge>
                ))}
                <Badge tone="neutral">Andheri West, Mumbai</Badge>
                <Badge tone="neutral">Within {params.radius ?? 10}km</Badge>
              </div>
            </div>
            <LinkButton href="#map" variant="outline">
              View on Map
            </LinkButton>
          </div>
          <div className="space-y-4">
            {results.results.length ? (
              results.results.map((provider) => <ProviderCard key={provider.id} provider={provider} />)
            ) : (
              <Card className="p-8 text-center">
                <h2 className="text-xl font-bold">We could not find providers matching all those filters.</h2>
                <p className="mt-2 text-slate-600">Try a broader condition, distance, or service filter.</p>
                <LinkButton href="/search" variant="outline" className="mt-5">
                  Clear some filters
                </LinkButton>
              </Card>
            )}
          </div>
        </section>

        <aside id="map" className="hidden xl:block">
          <MapPreview />
        </aside>
      </main>
    </div>
  );
}
