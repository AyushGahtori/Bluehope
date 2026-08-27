import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export function MapPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-[520px] bg-[#d6edf3]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute left-8 top-10 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
          Versova Beach
        </div>
        <div className="absolute right-12 top-20 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-bluehope">
          Andheri West
        </div>
        {[["45%", "32%"], ["60%", "52%"], ["35%", "70%"]].map(([left, top], index) => (
          <span
            key={`${left}-${top}`}
            className="absolute flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-bluehope text-white shadow-soft"
            style={{ left, top }}
          >
            <MapPin className="h-5 w-5" />
            <span className="sr-only">Map marker {index + 1}</span>
          </span>
        ))}
      </div>
      <div className="p-6">
        <p className="text-sm font-semibold text-slate-600">Provider locations across India</p>
        <p className="mt-1 text-xl font-extrabold text-bluehope">Set a distance filter to narrow by area</p>
      </div>
    </Card>
  );
}
