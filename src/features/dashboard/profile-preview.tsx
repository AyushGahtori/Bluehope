"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type ProfilePreviewData = {
  name: string;
  tagline: string;
  bio?: string;
  images: string[];
  services: string[];
  conditions: string[];
  openingHoursToday?: string;
  location?: string;
  ratingAverage?: number;
  ratingTotal?: number;
  verificationStatus: "notRequested" | "pending" | "verified" | "rejected" | "expired";
  completionPercent: number;
  missingItems: string[];
  editHref: string;
};

const VERIFICATION_LABELS = {
  notRequested: { label: "Not Verified", tone: "neutral" as const },
  pending: { label: "Verification Pending", tone: "amber" as const },
  verified: { label: "Verified", tone: "green" as const },
  rejected: { label: "Verification Rejected", tone: "amber" as const },
  expired: { label: "Verification Expired", tone: "neutral" as const },
};

/**
 * Large "what parents see" profile preview used at the top of the
 * provider/institute dashboards. Includes a gallery carousel so the owner can
 * flip through their own photos exactly like a family would.
 */
export function ProfilePreview({ data }: { data: ProfilePreviewData }) {
  const [index, setIndex] = useState(0);
  const hasImages = data.images.length > 0;
  const safeIndex = Math.min(index, Math.max(data.images.length - 1, 0));
  const verification = VERIFICATION_LABELS[data.verificationStatus];

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(280px,420px)_1fr]">
        <div className="relative min-h-[260px] bg-slate-100 lg:min-h-[320px]">
          {hasImages ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.images[safeIndex]}
                alt={`${data.name} photo ${safeIndex + 1}`}
                className="h-full w-full object-cover"
              />
              {data.images.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setIndex((value) => (value - 1 + data.images.length) % data.images.length)}
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-card transition hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setIndex((value) => (value + 1) % data.images.length)}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-card transition hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
                    {safeIndex + 1} / {data.images.length}
                  </span>
                  <div className="absolute bottom-4 left-4 flex gap-1.5">
                    {data.images.map((image, dotIndex) => (
                      <span
                        key={image}
                        className={cn(
                          "h-1.5 w-6 rounded-full",
                          dotIndex === safeIndex ? "bg-white" : "bg-white/50",
                        )}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-bluehope shadow-card">
                <ImagePlus className="h-7 w-7" />
              </span>
              <p className="font-bold text-slate-950">No photos yet</p>
              <p className="text-sm text-slate-600">
                Clear photos help families recognize and trust your profile.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={verification.tone}>{verification.label}</Badge>
            {typeof data.ratingAverage === "number" && data.ratingTotal ? (
              <Badge tone="blue">
                ★ {data.ratingAverage.toFixed(1)} · {data.ratingTotal} reviews
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-950 sm:text-3xl">{data.name}</h2>
          <p className="mt-1 text-sm font-semibold text-bluehope">{data.tagline}</p>
          {data.bio ? (
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{data.bio}</p>
          ) : null}

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">Open today</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">
                {data.openingHoursToday ?? "Not set yet"}
              </dd>
            </div>
            <div className="rounded-[8px] bg-slate-50 p-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">Location</dt>
              <dd className="mt-1 text-sm font-bold text-slate-900">{data.location ?? "Not set yet"}</dd>
            </div>
          </dl>

          {data.services.length || data.conditions.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {data.services.map((service) => (
                <Badge key={service}>{service}</Badge>
              ))}
              {data.conditions.map((condition) => (
                <Badge key={condition} tone="purple">
                  {condition}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">
                Profile {data.completionPercent}% complete
              </span>
              <Button variant="outline" className="h-9 px-4" onClick={() => {
                window.location.href = data.editHref;
              }}>
                Edit Profile
              </Button>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-bluehope transition-all"
                style={{ width: `${Math.max(4, Math.min(100, data.completionPercent))}%` }}
              />
            </div>
            {data.missingItems.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Missing: {data.missingItems.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Warm empty state for brand-new provider/institute accounts. */
export function EmptyProfileState({
  title,
  description,
  editHref,
}: {
  title: string;
  description: string;
  editHref: string;
}) {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-bluehope">
        <ImagePlus className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Adding clear photos, a useful description, and your availability helps families make informed decisions.
      </p>
      <a href={editHref} className="mt-6 inline-block">
        <Button>Edit Profile</Button>
      </a>
    </Card>
  );
}