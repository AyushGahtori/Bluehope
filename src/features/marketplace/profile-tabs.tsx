"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flag, ImagePlus, Star, ThumbsUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui/primitives";
import { conditions } from "@/data/taxonomy";
import { demoProfileQas, ratingDistribution, reviewsForProfile, type Review } from "@/data/marketplace";
import type { ProviderSummary } from "@/types/domain";
import { cn } from "@/lib/utils";

const conditionNames = new Map(conditions.map((condition) => [condition.id, condition.name]));

export function ProfileTabs({ profile }: { profile: ProviderSummary }) {
  const [tab, setTab] = useState<"about" | "reviews" | "gallery" | "qa">("about");

  return (
    <>
      <div className="mt-10 grid grid-cols-4 border-b border-slate-200 text-sm font-semibold text-slate-600">
        {[
          ["about", "About"],
          ["reviews", "Reviews"],
          ["gallery", "Gallery"],
          ["qa", "Q&A"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key as typeof tab)}
            className={cn("py-4 text-left", tab === key && "border-b-2 border-bluehope text-bluehope")}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "about" ? <AboutTab profile={profile} /> : null}
          {tab === "reviews" ? <ReviewsTab profile={profile} /> : null}
          {tab === "gallery" ? <GalleryTab /> : null}
          {tab === "qa" ? <QaTab /> : null}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function AboutTab({ profile }: { profile: ProviderSummary }) {
  return (
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
  );
}

function ReviewsTab({ profile }: { profile: ProviderSummary }) {
  const [reviews, setReviews] = useState<Review[]>(reviewsForProfile(profile));
  const distribution = useMemo(() => ratingDistribution(reviews), [reviews]);
  const average = useMemo(
    () => reviews.reduce((total, review) => total + review.rating, 0) / Math.max(1, reviews.length),
    [reviews],
  );

  const addReview = (review: Review) => setReviews((current) => [review, ...current]);

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-7">
        <SectionTitle title="Overall Rating" />
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div>
            <p className="text-5xl font-extrabold text-slate-950">{average.toFixed(1)}</p>
            <div className="mt-2 flex text-amber-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={cn("h-5 w-5", index < Math.round(average) && "fill-current")} />
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-500">{reviews.length} Reviews</p>
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating as 1 | 2 | 3 | 4 | 5];
              const width = `${(count / Math.max(1, reviews.length)) * 100}%`;
              return (
                <div key={rating} className="grid grid-cols-[70px_1fr_36px] items-center gap-3 text-sm">
                  <span>{rating} stars</span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-bluehope" style={{ width }} />
                  </span>
                  <span className="text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <ReviewComposer profile={profile} onAddReview={addReview} />
      <Card className="p-7">
        <SectionTitle title="Parent Reviews" />
        {reviews.length === 0 ? (
          <div className="rounded-[8px] bg-soft-blue p-6 text-center">
            <p className="font-bold text-slate-950">No reviews yet.</p>
            <p className="mt-1 text-sm text-slate-600">Be the first parent to share your experience.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewComposer({ profile, onAddReview }: { profile: ProviderSummary; onAddReview: (review: Review) => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .slice(0, 6 - images.length)
      .filter((file) => file.type.startsWith("image/") && file.size <= 6 * 1024 * 1024)
      .map((file) => URL.createObjectURL(file));
    setImages((current) => [...current, ...next]);
  };

  const submit = async () => {
    if (text.trim().length < 10) {
      setStatus("Please write a little more about your experience.");
      return;
    }

    setSubmitting(true);
    setStatus("Uploading review media metadata...");
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bluehope-demo": "true" },
      body: JSON.stringify({
        listingSlug: profile.slug,
        authorName: "Neha S.",
        rating,
        text,
        images,
      }),
    });
    setSubmitting(false);

    if (!response.ok) {
      setStatus("We couldn't publish that review. Please try again.");
      return;
    }

    const data = (await response.json()) as { review: Review };
    onAddReview(data.review);
    setText("");
    setImages([]);
    setStatus("Review submitted for moderation.");
  };

  return (
    <Card className="p-7">
      <SectionTitle title="Share your experience" eyebrow="Eligible parent review foundation" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <button key={index} type="button" onClick={() => setRating(index + 1)} aria-label={`${index + 1} star rating`}>
            <Star className={cn("h-7 w-7 text-amber-400", index < rating && "fill-current")} />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-4 min-h-28 w-full rounded-[12px] border border-slate-300 p-4 outline-none focus:border-bluehope focus:ring-4 focus:ring-blue-100"
        placeholder="Tell other parents about your experience..."
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-bluehope px-4 text-sm font-semibold text-bluehope transition hover:bg-blue-50">
          <ImagePlus className="h-4 w-4" />
          Add Photos
          <input type="file" multiple accept="image/*" className="sr-only" onChange={(event) => onFiles(event.target.files)} />
        </label>
        <p className="text-xs text-slate-500">Images stay pending moderation. Max 6 images, 6 MB each.</p>
      </div>
      {images.length ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((image, index) => (
            <span key={image} className="relative h-20 w-20 overflow-hidden rounded-[8px] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="absolute right-1 top-1 rounded-full bg-white p-1 shadow"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {status ? <p className="mt-3 text-sm font-semibold text-bluehope">{status}</p> : null}
      <Button className="mt-4" onClick={submit} disabled={submitting}>
        {submitting ? "Publishing..." : "Publish Review"}
      </Button>
    </Card>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const [reported, setReported] = useState(false);

  const report = async () => {
    await fetch("/api/reviews/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bluehope-demo": "true" },
      body: JSON.stringify({ reviewId: review.id, reason: "Personal information" }),
    });
    setReported(true);
  };

  return (
    <div className="rounded-[8px] border border-slate-100 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{review.authorName}</p>
          <p className="text-sm text-slate-500">{review.date}</p>
        </div>
        <div className="flex text-amber-400">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={cn("h-4 w-4", index < review.rating && "fill-current")} />
          ))}
        </div>
      </div>
      <p className="mt-4 leading-7 text-slate-600">{review.text}</p>
      {review.images.length ? (
        <div className="mt-4 flex gap-2">
          {review.images.map((image) => (
            <span key={image} className="h-16 w-16 rounded-[8px] bg-slate-100" />
          ))}
        </div>
      ) : null}
      {review.providerReply ? (
        <div className="mt-4 rounded-[8px] bg-blue-50 p-4">
          <p className="text-sm font-bold text-bluehope">Provider reply · {review.providerReply.date}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{review.providerReply.text}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button className="inline-flex items-center gap-1 font-semibold text-bluehope">
          <ThumbsUp className="h-4 w-4" />
          Helpful ({review.helpfulCount})
        </button>
        <button onClick={report} className="inline-flex items-center gap-1 font-semibold text-slate-500">
          <Flag className="h-4 w-4" />
          {reported ? "Reported" : "Report"}
        </button>
        {review.verifiedInteraction ? <Badge tone="green">Verified interaction</Badge> : <Badge tone="amber">Pending moderation</Badge>}
      </div>
    </div>
  );
}

function GalleryTab() {
  return (
    <Card className="mt-6 p-7">
      <SectionTitle title="Gallery" />
      <p className="text-slate-600">Gallery media will load progressively here after provider images are approved.</p>
    </Card>
  );
}

function QaTab() {
  return (
    <Card className="mt-6 p-7">
      <SectionTitle title="Profile Q&A" />
      <div className="space-y-4">
        {demoProfileQas.map((qa) => (
          <div key={qa.question} className="rounded-[8px] border border-slate-100 p-4">
            <p className="font-bold text-slate-950">{qa.question}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{qa.answer}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
