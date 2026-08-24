"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/primitives";

const DynamicMapPreview = dynamic(() => import("./map-preview").then((module) => module.MapPreview), {
  ssr: false,
  loading: () => (
    <Card className="overflow-hidden">
      <div className="h-[360px] animate-pulse bg-slate-100" />
      <div className="p-6">
        <p className="h-4 w-48 rounded bg-slate-100" />
        <p className="mt-3 h-6 w-56 rounded bg-slate-100" />
      </div>
    </Card>
  ),
});

export function LazyMapPreview() {
  return <DynamicMapPreview />;
}
