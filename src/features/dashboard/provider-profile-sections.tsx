"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Camera,
  Clock,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge, Button, Card, Input, SectionTitle } from "@/components/ui/primitives";
import {
  authedApiHeaders,
  isConfigurationPendingResponse,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Placeholder for the future verification workflow. No fake verification. */
export function VerifyPlaceholder() {
  return (
    <DashboardShell
      nav={["Dashboard", "My Profile", "Explore", "Inquiries", "Appointments", "Reviews & Ratings", "Messages", "Q&A", "Edit Profile", "Verify"]}
      roleLabel="Verify"
      role="provider"
    >
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-bluehope">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Verification</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {"Verification helps families understand which providers and organizations have completed BlueHope's "}
          verification process.
        </p>
        <Badge tone="amber" className="mt-5">Verification is coming next</Badge>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Your profile completeness and review quality are already visible to families. When verification opens, you
          will be able to start it right from this page.
        </p>
      </Card>
    </DashboardShell>
  );
}

type QaItem = { id: string; question: string; answer: string };

/** Provider/institute-managed FAQ shown on the public profile once approved. */
export function QaSection() {
  const [items, setItems] = useState<QaItem[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const add = () => {
    if (!question.trim() || !answer.trim()) return;
    setItems((current) => [
      ...current,
      { id: `qa-${Date.now()}`, question: question.trim(), answer: answer.trim() },
    ]);
    setQuestion("");
    setAnswer("");
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Q&A" eyebrow="Help families decide" />
      <Card className="bg-soft-blue p-6">
        <p className="text-lg font-bold text-bluehope">Help families get answers before they contact you.</p>
        <p className="mt-1 text-sm text-slate-600">
          Add the questions parents ask most often. Approved answers appear on your public profile.
        </p>
      </Card>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-bold text-slate-950">No questions yet.</p>
          <p className="mt-1 text-sm text-slate-600">
            Add your first common question below — it will appear on your public profile.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-950">{item.question}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.answer}</p>
                </div>
                <Button
                  variant="ghost"
                  aria-label={`Delete question: ${item.question}`}
                  onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="space-y-3 p-5">
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Add a common question" />
        <Input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Add your answer" />
        <Button onClick={add} disabled={!question.trim() || !answer.trim()}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </Card>
    </div>
  );
}

const PHOTO_GUIDELINES = [
  { icon: Building2, title: "Show the building or entrance", text: "Upload a clear photo that helps families recognize your location." },
  { icon: Camera, title: "Show your therapy/classroom environment", text: "Help parents understand where children will receive support." },
  { icon: ImagePlus, title: "Show your learning/therapy setup", text: "Show the equipment, learning materials, or spaces you use." },
  { icon: Camera, title: "Show your team or professionals", text: "Where appropriate and with proper consent, show the people delivering your services." },
  { icon: ImagePlus, title: "Show the child-friendly environment", text: "Highlight spaces that demonstrate a welcoming, accessible environment." },
  { icon: Camera, title: "Keep photos professional", text: "Use bright, clear, well-composed images and avoid blurry or unnecessarily personal photographs." },
];

const EDITOR_SECTIONS = [
  { id: "images", label: "Images" },
  { id: "bio", label: "About / Bio" },
  { id: "details", label: "Organization details" },
  { id: "services", label: "Services & Conditions" },
  { id: "hours", label: "Opening hours" },
  { id: "location", label: "Location" },
  { id: "pricing", label: "Pricing" },
  { id: "contact", label: "Contact information" },
] as const;

const BIO_LIMIT = 1200;
const GUIDANCE_KEY = "bluehope.editProfileGuidanceSeen";

const SERVICE_OPTIONS = [
  "Speech Therapy",
  "Occupational Therapy",
  "Physiotherapy",
  "Behaviour Therapy",
  "ABA",
  "Special Education",
];
const CONDITION_OPTIONS = [
  "Autism Spectrum Disorder",
  "ADHD",
  "Speech & Language Delay",
  "Down Syndrome",
  "Sensory Processing",
];

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type WeeklyHours = Record<string, { open: string; close: string } | null>;
type LocationMeta = {
  text: string;
  source: "browser_geolocation" | "manual" | null;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ProfileShape = {
  name: string;
  tagline: string;
  bio: string;
  images: string[];
  services: string[];
  conditions: string[];
  weeklyHours: WeeklyHours;
  location: LocationMeta | null;
  pricing: Record<string, string>;
  contact: Record<string, string>;
  details: Record<string, string>;
  profileCompleteness?: number;
};

const EMPTY_PROFILE: ProfileShape = {
  name: "",
  tagline: "",
  bio: "",
  images: [],
  services: [],
  conditions: [],
  weeklyHours: {},
  location: null,
  pricing: {},
  contact: {},
  details: {},
};

/**
 * Sectioned profile editor used for BOTH first-time completion and later
 * edits. All data loads from and persists to the caller's own Firestore
 * profile (ownerUid-scoped); images upload to the caller's own Storage path.
 */
export function EditProfileSection({ ownerType }: { ownerType: "provider" | "institution" }) {
  const [showGuidance, setShowGuidance] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof EDITOR_SECTIONS)[number]["id"]>("images");
  const [profile, setProfile] = useState<ProfileShape>(EMPTY_PROFILE);
  const [loadState, setLoadState] = useState<"loading" | "ready">("loading");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [completion, setCompletion] = useState<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (!window.localStorage.getItem(GUIDANCE_KEY)) setShowGuidance(true);
      } catch {
        // Storage unavailable: skip guidance persistence.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadProfile = useCallback(async () => {
    const headers = await authedApiHeaders();
    if (!headers) {
      setLoadState("ready");
      return;
    }
    try {
      const response = await fetch("/api/provider-profile", { headers, cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok && body && typeof body === "object") {
        const data = body as { profile?: Partial<ProfileShape> | null };
        if (data.profile) {
          setProfile({
            ...EMPTY_PROFILE,
            ...data.profile,
            images: data.profile.images ?? [],
            services: data.profile.services ?? [],
            conditions: data.profile.conditions ?? [],
            weeklyHours: data.profile.weeklyHours ?? {},
            pricing: data.profile.pricing ?? {},
            contact: data.profile.contact ?? {},
            details: data.profile.details ?? {},
          });
          setCompletion(data.profile.profileCompleteness);
        }
      } else if (isConfigurationPendingResponse(response.status, body)) {
        // Persistence not configured: keep the editor usable with local state.
      }
    } catch {
      // Keep the editor usable; saving will surface a clear error if needed.
    } finally {
      setLoadState("ready");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!ignore) void loadProfile();
    return () => {
      ignore = true;
    };
  }, [loadProfile]);

  const dismissGuidance = () => {
    setShowGuidance(false);
    try {
      window.localStorage.setItem(GUIDANCE_KEY, "1");
    } catch {
      // Ignore.
    }
  };

  const patchProfile = (patch: Partial<ProfileShape>) =>
    setProfile((current) => ({ ...current, ...patch }));

  const saveProfile = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const headers = await authedApiHeaders();
      if (!headers) {
        setSaveMessage("You need to be signed in to save. Please refresh and try again.");
        return;
      }
      const response = await fetch("/api/provider-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(profile),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.ok && body && typeof body === "object") {
        const data = body as { profile?: ProfileShape & { profileCompleteness?: number } };
        if (data.profile?.profileCompleteness !== undefined) {
          setCompletion(data.profile.profileCompleteness);
        }
        setSaveMessage("Changes saved.");
      } else if (isConfigurationPendingResponse(response.status, body)) {
        setSaveMessage("Saving is not available in this environment yet.");
      } else {
        setSaveMessage("We couldn't save your changes. Please try again.");
      }
    } catch {
      setSaveMessage("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setSaveMessage("");
    try {
      const headers = await authedApiHeaders();
      if (!headers) {
        setSaveMessage("You need to be signed in to upload photos.");
        return;
      }
      for (const file of files.slice(0, 12)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/media/upload", {
          method: "POST",
          headers,
          body: formData,
        });
        const body: unknown = await response.json().catch(() => null);
        if (response.ok && body && typeof body === "object") {
          const data = body as { url?: string; profile?: ProfileShape };
          if (data.url) {
            patchProfile({ images: data.profile?.images ?? [...profile.images, data.url] });
          }
          if (data.profile?.profileCompleteness !== undefined) {
            setCompletion(data.profile.profileCompleteness);
          }
        } else if (!isConfigurationPendingResponse(response.status, body)) {
          setSaveMessage("One or more photos couldn't be uploaded. Please try again.");
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (image: string) => {
    patchProfile({ images: profile.images.filter((item) => item !== image) });
  };

  const captureBrowserLocation = () => {
    if (window.isSecureContext === false) {
      setSaveMessage("Location requires HTTPS or localhost. Enter your address manually below.");
      return;
    }
    if (!navigator.geolocation) {
      setSaveMessage("Location is not available in this browser. Enter your address manually below.");
      return;
    }
    setSaveMessage("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        patchProfile({
          location: {
            text: profile.location?.text ?? `Captured location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            source: "browser_geolocation",
            capturedAt: new Date().toISOString(),
            latitude,
            longitude,
          },
        });
        setSaveMessage("Location captured from your device. Review the address text and adjust it if needed.");
      },
      (error) => {
        setSaveMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow access in your browser site settings, try again, or enter your address manually."
            : error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT
              ? "We couldn't access your location. Please try again or enter your address manually."
              : "We couldn't access your location. Please try again or enter your address manually.",
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const setLocationText = (text: string) => {
    patchProfile({
      location: {
        text,
        source: "manual",
        capturedAt: text ? new Date().toISOString() : null,
        latitude: null,
        longitude: null,
      },
    });
  };

  if (loadState === "loading") {
    return <div className="h-96 animate-pulse rounded-[8px] bg-slate-100" aria-busy="true" />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title={ownerType === "provider" ? "Edit provider profile" : "Edit institute profile"}
        eyebrow="Structured sections"
      />

      {showGuidance ? (
        <Card className="border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-extrabold text-slate-950">{"Let's build a profile families can trust."}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Strong profiles include clear photos, a useful description, your services, opening hours, location, and
            relevant information about your organization. You can fill these in one calm section at a time.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTO_GUIDELINES.map((guide) => (
              <div key={guide.title} className="rounded-[10px] bg-white p-4 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-bluehope">
                  <guide.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-bold text-sm text-slate-950">{guide.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{guide.text}</p>
              </div>
            ))}
          </div>
          <Button className="mt-5" onClick={dismissGuidance}>
            Got it — start editing
          </Button>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {EDITOR_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              activeSection === section.id
                ? "border-bluehope bg-bluehope text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-bluehope",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {activeSection === "images" ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Photos</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {profile.images.map((image) => (
                <div key={image} className="relative overflow-hidden rounded-[10px] border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeImage(image)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-rose-600 shadow-card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-bluehope bg-blue-50 text-sm font-semibold text-bluehope">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                {uploading ? "Uploading…" : "Add photos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void uploadImages(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Up to 12 photos. Photos upload to your own private storage path and only your account can manage them.
            </p>
          </div>
        ) : null}

        {activeSection === "bio" ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">About</h3>
            <textarea
              value={profile.bio}
              maxLength={BIO_LIMIT}
              onChange={(event) => patchProfile({ bio: event.target.value })}
              rows={7}
              placeholder="Who you are, what you specialize in, your philosophy, and what makes your organization different."
              className="w-full rounded-lg border border-slate-300 p-4 text-sm outline-none focus:border-bluehope focus:ring-4 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-500">{profile.bio.length} / {BIO_LIMIT} characters</p>
          </div>
        ) : null}

        {activeSection === "details" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <h3 className="col-span-full text-lg font-bold">Organization details</h3>
            <Input
              value={profile.name}
              onChange={(event) => patchProfile({ name: event.target.value })}
              placeholder="Official name"
            />
            <Input
              value={profile.tagline}
              onChange={(event) => patchProfile({ tagline: event.target.value })}
              placeholder="Short tagline"
            />
            <Input
              value={profile.details.foundedYear ?? ""}
              onChange={(event) => patchProfile({ details: { ...profile.details, foundedYear: event.target.value } })}
              placeholder="Founded year"
            />
            <Input
              value={profile.details.registrationNumber ?? ""}
              onChange={(event) => patchProfile({ details: { ...profile.details, registrationNumber: event.target.value } })}
              placeholder="Registration number"
            />
            <Input
              value={profile.details.website ?? ""}
              onChange={(event) => patchProfile({ details: { ...profile.details, website: event.target.value } })}
              placeholder="Website"
            />
          </div>
        ) : null}

        {activeSection === "services" ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">Services & Conditions</h3>
            <p className="text-sm text-slate-600">Select everything that applies — this drives how families find you.</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((service) => (
                <Chip
                  key={service}
                  label={service}
                  selected={profile.services.includes(service)}
                  onToggle={() =>
                    patchProfile({
                      services: profile.services.includes(service)
                        ? profile.services.filter((item) => item !== service)
                        : [...profile.services, service],
                    })
                  }
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {CONDITION_OPTIONS.map((condition) => (
                <Chip
                  key={condition}
                  label={condition}
                  tone="purple"
                  selected={profile.conditions.includes(condition)}
                  onToggle={() =>
                    patchProfile({
                      conditions: profile.conditions.includes(condition)
                        ? profile.conditions.filter((item) => item !== condition)
                        : [...profile.conditions, condition],
                    })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {activeSection === "hours" ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><Clock className="h-5 w-5 text-bluehope" /> Opening hours</h3>
            <p className="text-sm text-slate-600">
              Weekly operating hours shown on your profile. Appointment slots are managed separately under Availability.
            </p>
            <OpeningHoursEditor
              value={profile.weeklyHours}
              onChange={(weeklyHours) => patchProfile({ weeklyHours })}
            />
          </div>
        ) : null}

        {activeSection === "location" ? (
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-bluehope" /> Location</h3>
            <Input
              value={profile.location?.text ?? ""}
              onChange={(event) => setLocationText(event.target.value)}
              placeholder="Formatted address"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                value={profile.details.city ?? ""}
                onChange={(event) => patchProfile({ details: { ...profile.details, city: event.target.value } })}
                placeholder="City"
              />
              <Input
                value={profile.details.locality ?? ""}
                onChange={(event) => patchProfile({ details: { ...profile.details, locality: event.target.value } })}
                placeholder="Locality"
              />
              <Input
                value={profile.details.state ?? ""}
                onChange={(event) => patchProfile({ details: { ...profile.details, state: event.target.value } })}
                placeholder="State"
              />
              <Input
                value={profile.details.postalCode ?? ""}
                onChange={(event) => patchProfile({ details: { ...profile.details, postalCode: event.target.value } })}
                placeholder="Postal code"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="h-10" onClick={captureBrowserLocation}>
                <LocateFixed className="mr-2 h-4 w-4" />
                Use current location
              </Button>
              {profile.location?.source ? (
                <Badge tone={profile.location.source === "browser_geolocation" ? "green" : "neutral"}>
                  {profile.location.source === "browser_geolocation"
                    ? "From device location"
                    : "Entered manually"}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              Browser-derived locations are stored separately from manually entered addresses. Manually entered
              addresses are marked as user-provided, not GPS-verified.
            </p>
          </div>
        ) : null}

        {activeSection === "pricing" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <h3 className="col-span-full text-lg font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-bluehope" /> Pricing</h3>
            <Input
              type="number"
              value={profile.pricing.minFee ?? ""}
              onChange={(event) => patchProfile({ pricing: { ...profile.pricing, minFee: event.target.value } })}
              placeholder="Minimum fee (INR)"
            />
            <Input
              type="number"
              value={profile.pricing.maxFee ?? ""}
              onChange={(event) => patchProfile({ pricing: { ...profile.pricing, maxFee: event.target.value } })}
              placeholder="Maximum fee (INR)"
            />
            <Input
              value={profile.pricing.label ?? ""}
              onChange={(event) => patchProfile({ pricing: { ...profile.pricing, label: event.target.value } })}
              placeholder="Session label (e.g., per session)"
            />
          </div>
        ) : null}

        {activeSection === "contact" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <h3 className="col-span-full text-lg font-bold">Contact information</h3>
            <Input
              value={profile.contact.phone ?? ""}
              onChange={(event) => patchProfile({ contact: { ...profile.contact, phone: event.target.value } })}
              placeholder="Public phone number"
            />
            <Input
              value={profile.contact.email ?? ""}
              onChange={(event) => patchProfile({ contact: { ...profile.contact, email: event.target.value } })}
              placeholder="Public email"
            />
            <Input
              value={profile.contact.whatsapp ?? ""}
              onChange={(event) => patchProfile({ contact: { ...profile.contact, whatsapp: event.target.value } })}
              placeholder="WhatsApp number"
            />
          </div>
        ) : null}
      </Card>

      {saveMessage ? (
        <p className={cn("text-sm font-semibold", saveMessage === "Changes saved." ? "text-emerald-700" : "text-slate-600")}>
          {saveMessage}
        </p>
      ) : null}
      {typeof completion === "number" ? (
        <p className="text-sm text-slate-500">Profile {completion}% complete</p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled={saving} onClick={() => void loadProfile()}>
          Reset changes
        </Button>
        <Button disabled={saving} onClick={() => void saveProfile()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Chip({
  label,
  tone = "blue",
  selected,
  onToggle,
}: {
  label: string;
  tone?: "blue" | "purple";
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        selected
          ? tone === "blue"
            ? "border-bluehope bg-bluehope text-white"
            : "border-purple-500 bg-purple-500 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
      )}
    >
      {label}
    </button>
  );
}

function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: WeeklyHours;
  onChange: (value: WeeklyHours) => void;
}) {
  const setDay = (day: string, hours: { open: string; close: string } | null) => {
    onChange({ ...value, [day]: hours });
  };

  return (
    <div className="grid gap-3">
      {DAY_KEYS.map((day) => {
        const hours = value[day] ?? null;
        const closed = !hours;
        return (
          <div
            key={day}
            className="grid gap-3 rounded-[10px] border border-slate-200 p-4 sm:grid-cols-[140px_1fr_auto] sm:items-center"
          >
            <p className="font-bold text-slate-950">{DAY_LABELS[day]}</p>
            {closed ? (
              <p className="rounded-[8px] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">Closed</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="time"
                  value={hours.open}
                  aria-label={`${DAY_LABELS[day]} opening time`}
                  onChange={(event) => setDay(day, { ...hours, open: event.target.value })}
                />
                <Input
                  type="time"
                  value={hours.close}
                  aria-label={`${DAY_LABELS[day]} closing time`}
                  onChange={(event) => setDay(day, { ...hours, close: event.target.value })}
                />
              </div>
            )}
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setDay(day, closed ? { open: "09:00", close: "18:00" } : null)}
            >
              {closed ? "Mark open" : "Mark closed"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}