import { redirect } from "next/navigation";

export const metadata = {
  title: "Search | BlueHope",
  description: "Browse and search all trusted therapists, educators, clinics, and schools on BlueHope.",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      search.set(key, value[0]);
    }
  }
  const query = search.toString();
  redirect(query ? `/dashboard/parent/search?${query}` : "/dashboard/parent/search");
}