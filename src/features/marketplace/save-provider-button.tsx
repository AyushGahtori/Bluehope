"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { apiHeaders } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Shared saved-provider state: loads the current saved state for a listing
 * and persists toggles under the signed-in account (or the demo workspace
 * for guests). Optimistic update with rollback on failure.
 */
export function useSavedProvider(slug: string, name?: string) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let ignore = false;
    apiHeaders()
      .then((headers) => fetch("/api/saved-providers", { headers }))
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) {
          setSaved(
            Array.isArray(data.savedProviders) &&
              data.savedProviders.some((item: { listingSlug: string }) => item.listingSlug === slug),
          );
          setReady(true);
        }
      })
      .catch(() => {
        if (!ignore) setReady(true);
      });
    return () => {
      ignore = true;
    };
  }, [slug]);

  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    try {
      const response = await fetch("/api/saved-providers", {
        method: "POST",
        headers: await apiHeaders(),
        body: JSON.stringify({ listingSlug: slug, listingName: name, saved: next }),
      });
      if (!response.ok) setSaved(!next);
    } catch {
      setSaved(!next);
    }
  };

  return { saved, ready, toggle };
}

export function SaveProviderButton({
  slug,
  name,
  compact = false,
}: {
  slug: string;
  name?: string;
  compact?: boolean;
}) {
  const { saved, toggle } = useSavedProvider(slug, name);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => void toggle()}
      aria-pressed={saved}
      className={cn(
        "rounded-md bg-blue-50 p-2 text-slate-900 transition hover:bg-blue-100",
        saved && "bg-bluehope text-white hover:bg-bluehope-dark",
      )}
      aria-label={saved ? "Remove saved provider" : "Save provider"}
      title={saved ? "Saved" : "Save provider"}
    >
      <Heart className={cn(compact ? "h-4 w-4" : "h-5 w-5", saved && "fill-current")} />
    </motion.button>
  );
}