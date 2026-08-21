import { SearchResultsPage } from "@/features/marketplace/search-results";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const scalar = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  return (
    <SearchResultsPage
      params={{
        q: scalar(params.q) ?? "speech therapy",
        service: scalar(params.service),
        condition: scalar(params.condition),
        age: scalar(params.age),
        radius: scalar(params.radius) ? Number(scalar(params.radius)) : 10,
        providerType: scalar(params.providerType),
        language: scalar(params.language),
        sort: (scalar(params.sort) as never) ?? "most-relevant",
      }}
    />
  );
}
