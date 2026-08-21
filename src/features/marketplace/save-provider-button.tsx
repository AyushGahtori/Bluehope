"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SaveProviderButton({ compact = false }: { compact?: boolean }) {
  const [saved, setSaved] = useState(false);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setSaved((value) => !value)}
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
