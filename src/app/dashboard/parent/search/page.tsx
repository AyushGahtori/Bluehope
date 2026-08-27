import { Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SearchResultsContent } from "@/features/marketplace/search-results";

export const metadata = {
  title: "Search Providers & Services | BlueHope",
  description:
    "Browse and search all trusted therapists, educators, clinics, and schools on BlueHope.",
};

const parentNav = [
  "Dashboard",
  "Search",
  "Saved Providers",
  "My Enquiries",
  "Appointments",
  "Messages",
  "Notifications",
  "Resources",
  "My Children",
  "Profile Settings",
];

export default async function ParentSearchPage({
  searchParams,
}: PageProps<"/dashboard/parent/search">) {
  const params = await searchParams;
  const scalar = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const radius = scalar(params.radius);
  const q = scalar(params.q) ?? "";
  const location = scalar(params.location) ?? "";

  const searchHeader = (
    <form
      action="/dashboard/parent/search"
      className="flex flex-1 max-w-3xl items-center gap-2 sm:gap-3"
    >
      <div className="flex h-12 flex-1 min-w-0 items-center gap-3 rounded-lg border border-slate-300 px-3 sm:px-4 text-sm text-slate-500 transition focus-within:border-bluehope focus-within:ring-4 focus-within:ring-blue-100">
        <Search className="h-5 w-5 shrink-0" />
        <input
          name="q"
          defaultValue={q}
          className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-500"
          placeholder="Search Therapy, Condition or Provider"
        />
      </div>
      <div className="hidden sm:flex h-12 w-44 md:w-56 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-500 transition focus-within:border-bluehope focus-within:ring-4 focus-within:ring-blue-100">
        <input
          name="location"
          defaultValue={location}
          className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-500"
          placeholder="Andheri West, Mumbai"
        />
      </div>
      <button
        type="submit"
        className="h-12 shrink-0 rounded-lg bg-bluehope px-4 sm:px-6 text-sm font-semibold text-white transition hover:bg-bluehope-dark active:scale-[0.98]"
      >
        Search
      </button>
    </form>
  );

  return (
    <DashboardShell
      nav={parentNav}
      roleLabel="Hi there"
      role="parent"
      searchHeader={searchHeader}
    >
      <SearchResultsContent
        params={{
          q,
          location: scalar(params.location),
          service: scalar(params.service),
          condition: scalar(params.condition),
          age: scalar(params.age),
          radius: radius ? Number(radius) : undefined,
          page: scalar(params.page)
            ? Math.max(Number(scalar(params.page)), 1)
            : 1,
          providerType: scalar(params.providerType),
          language: scalar(params.language),
          sort: (scalar(params.sort) as never) ?? "most-relevant",
        }}
        basePath="/dashboard/parent/search"
      />
    </DashboardShell>
  );
}
