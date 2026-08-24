import { AppNav } from "@/components/layout/app-nav";
import { Card } from "@/components/ui/primitives";

export default function ProviderProfileLoading() {
  return (
    <div className="min-h-screen bg-white">
      <AppNav dashboard />
      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <Card className="p-6">
            <div className="grid gap-8 md:grid-cols-[360px_1fr]">
              <div className="h-80 animate-pulse rounded-[8px] bg-slate-100" />
              <div className="space-y-5">
                <div className="h-10 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-12 animate-pulse rounded bg-slate-100" />
                  <div className="h-12 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            </div>
          </Card>
          <Card className="h-72 animate-pulse bg-slate-100" />
        </section>
        <aside className="space-y-6">
          <Card className="h-56 animate-pulse bg-slate-100" />
          <Card className="h-32 animate-pulse bg-slate-100" />
          <Card className="h-80 animate-pulse bg-slate-100" />
        </aside>
      </main>
    </div>
  );
}
