"use client";

import { useState } from "react";
import { BlueCheckbox } from "@/components/ui/primitives";

const options = [
  {
    key: "join",
    label: "Join parent communities",
    description: "Let BlueHope notify you when moderated parent communities become available.",
  },
  {
    key: "similar",
    label: "Connect with parents with similar support needs",
    description: "Future matching will use broad support categories, not private child details.",
  },
  {
    key: "nearby",
    label: "Receive nearby group invitations",
    description: "Use your saved locality preference to suggest optional local groups.",
  },
] as const;

type PreferenceKey = (typeof options)[number]["key"];
const defaultPreferences: Record<PreferenceKey, boolean> = {
  join: false,
  similar: false,
  nearby: false,
};

export function CommunityPreferences() {
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>(() => {
    if (typeof window === "undefined") return defaultPreferences;

    const saved = window.localStorage.getItem("bluehope.communityPreferences");
    if (!saved) return defaultPreferences;

    try {
      return { ...defaultPreferences, ...JSON.parse(saved) };
    } catch {
      return defaultPreferences;
    }
  });

  const update = (key: PreferenceKey, checked: boolean) => {
    setPreferences((current) => {
      const next = { ...current, [key]: checked };
      window.localStorage.setItem("bluehope.communityPreferences", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="mt-5 space-y-2">
      {options.map((option) => (
        <BlueCheckbox
          key={option.key}
          checked={preferences[option.key]}
          onCheckedChange={(checked) => update(option.key, checked)}
          label={option.label}
          description={option.description}
        />
      ))}
    </div>
  );
}
