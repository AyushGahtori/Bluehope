import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import {
  Badge,
  BlueSelect,
  Card,
  Input,
  LinkButton,
} from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import { searchProviders, type SearchParams } from "@/services/search-service";
import { MapPreview } from "./map-preview";
import { ProviderCard } from "./provider-card";

function buildHref(
  params: SearchParams,
  overrides: Partial<SearchParams>,
  basePath = "/dashboard/parent/search",
) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  // Only real user intent is serialized — no default/fake values in the URL.
  if (merged.q) search.set("q", merged.q);
  if (merged.location) search.set("location", merged.location);
  if (merged.service) search.set("service", merged.service);
  if (merged.condition) search.set("condition", merged.condition);
  if (merged.age) search.set("age", merged.age);
  if (merged.radius !== undefined) search.set("radius", String(merged.radius));
  if (merged.language) search.set("language", merged.language);
  if (merged.sort && merged.sort !== "most-relevant")
    search.set("sort", merged.sort);
  if ((overrides.page ?? merged.page ?? 1) > 1)
    search.set("page", String(overrides.page ?? merged.page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function SearchResultsContent({
  params,
  basePath = "/dashboard/parent/search",
}: {
  params: SearchParams;
  basePath?: string;
}) {
  const results = await searchProviders(params);
  const totalPages = results.totalPages;
  const hasAnyFilter = Boolean(
    params.q ||
    params.location ||
    params.service ||
    params.condition ||
    params.radius !== undefined,
  );

  return (
    <div className="w-full">
      <div className="grid gap-6 xl:grid-cols-[280px_1fr_410px]">
        <Card className="h-fit p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Filters</h2>
            <LinkButton href={basePath} variant="ghost" className="h-auto px-0">
              Clear All
            </LinkButton>
          </div>
          <div className="space-y-5 text-sm">
            <label className="block">
              <span className="font-semibold">Distance</span>
              <BlueSelect
                name="radius"
                defaultValue={
                  params.radius !== undefined ? String(params.radius) : ""
                }
                placeholder="Any distance"
                className="mt-2"
                options={[1, 5, 10, 20, 50, 100].map((radius) => ({
                  value: String(radius),
                  label: `Within ${radius} km`,
                }))}
              />
            </label>
            <label className="block">
              <span className="font-semibold">Service Type</span>
              <BlueSelect
                name="service"
                defaultValue={params.service ?? ""}
                placeholder="Any service"
                className="mt-2"
                options={[
                  { value: "", label: "Any service" },
                  ...services.map((service) => ({
                    value: service.id,
                    label: service.name,
                  })),
                ]}
              />
            </label>
            <label className="block">
              <span className="font-semibold">Condition</span>
              <BlueSelect
                name="condition"
                defaultValue={params.condition ?? ""}
                placeholder="Any condition"
                className="mt-2"
                options={[
                  { value: "", label: "Any condition" },
                  ...conditions.map((condition) => ({
                    value: condition.id,
                    label: condition.name,
                  })),
                ]}
              />
            </label>
            <label className="block">
              <span className="font-semibold">Sort</span>
              <BlueSelect
                name="sort"
                defaultValue={params.sort ?? "most-relevant"}
                placeholder="Sort results"
                className="mt-2"
                options={[
                  { value: "most-relevant", label: "Most Relevant" },
                  { value: "nearest", label: "Nearest" },
                  { value: "highest-rated", label: "Highest Rated" },
                  { value: "most-experienced", label: "Most Experienced" },
                ]}
              />
            </label>
          </div>
        </Card>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-950">
                {results.total} {results.total === 1 ? "listing" : "listings"}{" "}
                found
                {params.q ? (
                  <>
                    {" "}
                    for <span className="text-bluehope">{params.q}</span>
                  </>
                ) : null}
              </h1>
              <div className="mt-4 flex flex-wrap gap-3">
                {params.q ? <Badge tone="neutral">{params.q}</Badge> : null}
                {params.location ? (
                  <Badge tone="neutral">{params.location}</Badge>
                ) : null}
                {params.radius !== undefined ? (
                  <Badge tone="neutral">Within {params.radius}km</Badge>
                ) : null}
                {!hasAnyFilter ? (
                  <Badge tone="neutral">All listings</Badge>
                ) : null}
              </div>
            </div>
            <LinkButton href="#map" variant="outline">
              View on Map
            </LinkButton>
          </div>
          <div className="space-y-4">
            {results.results.length ? (
              results.results.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))
            ) : (
              <Card className="p-8 text-center">
                {hasAnyFilter ? (
                  <>
                    <h2 className="text-xl font-bold">
                      We could not find listings matching all those filters.
                    </h2>
                    <p className="mt-2 text-slate-600">
                      Try a broader condition, distance, or service filter.
                    </p>
                    <LinkButton
                      href={basePath}
                      variant="outline"
                      className="mt-5"
                    >
                      Clear some filters
                    </LinkButton>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold">
                      No providers or institutes are available yet.
                    </h2>
                    <p className="mt-2 text-slate-600">
                      New listings will appear here as they register on
                      BlueHope.
                    </p>
                  </>
                )}
              </Card>
            )}
          </div>
          {totalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-center gap-3"
              aria-label="Pagination"
            >
              {results.page > 1 ? (
                <Link
                  href={buildHref(params, { page: results.page - 1 }, basePath)}
                  className="inline-flex h-11 items-center gap-1 rounded-lg border border-bluehope px-4 text-sm font-semibold text-bluehope transition hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              ) : null}
              <span className="text-sm font-medium text-slate-600">
                Page {results.page} of {totalPages}
              </span>
              {results.page < totalPages ? (
                <Link
                  href={buildHref(params, { page: results.page + 1 }, basePath)}
                  className="inline-flex h-11 items-center gap-1 rounded-lg border border-bluehope px-4 text-sm font-semibold text-bluehope transition hover:bg-blue-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>

        <aside id="map" className="hidden xl:block">
          <MapPreview />
        </aside>
      </div>
    </div>
  );
}

export async function SearchResultsPage({ params }: { params: SearchParams }) {
  return (
    <div className="min-h-screen bg-white">
      <AppNav />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <SearchResultsContent
          params={params}
          basePath="/dashboard/parent/search"
        />
      </main>
    </div>
  );
}
