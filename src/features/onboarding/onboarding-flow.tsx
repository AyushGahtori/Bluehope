"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  FileUp,
  LogIn,
  LocateFixed,
  Search,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { BlueHopeLogo } from "@/components/brand/logo";
import { Badge, BlueSelect, Button, Card, Input } from "@/components/ui/primitives";
import { getFirebaseAuth, getFirebaseWebKeyIssue, googleProvider } from "@/config/firebase";
import {
  isParentOnboardingComplete,
  isParentOnboardingCompleteSync,
  saveParentOnboarding,
} from "@/lib/parent-onboarding";
import { signInWithGoogleAndEstablishRole } from "@/lib/auth-service";
import { authedApiHeaders } from "@/lib/api-client";
import { RoleConflictScreen } from "@/features/onboarding/role-conflict-screen";
import type { SelfServeAccountRole } from "@/models/firestore";
import { conditions, services } from "@/data/taxonomy";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/domain";

const roleCopy = {
  parent: {
    title: "Tell us who you are looking for support for",
    subtitle: "A short, calm setup that helps personalize discovery.",
    steps: ["Support for", "Sign in", "Basic info", "Needs", "Location"],
  },
  provider: {
    title: "Set up your provider foundation",
    subtitle: "Families can discover your services once your profile is ready.",
    steps: ["Basic info", "Sign in", "Services", "Credentials", "Opening hours", "Location"],
  },
  institute: {
    title: "Set up your institute profile",
    subtitle: "List your organization, services, and future branch structure.",
    steps: ["Sign in", "Organization", "Business", "Services", "Opening hours", "Locations"],
  },
} satisfies Record<Role, { title: string; subtitle: string; steps: string[] }>;

export function OnboardingFlow({ role }: { role: Role }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [supportFor, setSupportFor] = useState<"myself" | "family">("family");
  const [authUser, setAuthUser] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locationMeta, setLocationMeta] = useState<{
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
  }>({ source: null, capturedAt: null });
  const [saving, setSaving] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [providerDetails, setProviderDetails] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    title: "",
    email: "",
    phone: "",
  });
  const [orgDetails, setOrgDetails] = useState({
    name: "",
    email: "",
    phone: "",
    representative: "",
    designation: "",
    website: "",
    gst: "",
    registration: "",
    foundedYear: "",
    orgType: "",
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<
    Record<string, { open: string; close: string } | null>
  >({});
  const [roleConflict, setRoleConflict] = useState<SelfServeAccountRole | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [basicInfo, setBasicInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "",
    age: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conditionQuery, setConditionQuery] = useState("");
  const [selectedConditionIds, setSelectedConditionIds] = useState<string[]>([
    "autism",
    "speech-delay",
    "sensory-processing",
  ]);
  const copy = roleCopy[role];
  // The institute flow authenticates first (sign-in is step 1); the parent and
  // provider flows keep their intro step before sign-in.
  const signInStep = role === "institute" ? 0 : 1;
  const progress = ((step + 1) / copy.steps.length) * 100;
  const dashboardPath =
    role === "parent"
      ? "/dashboard/parent"
      : role === "provider"
        ? "/dashboard/provider"
        : "/dashboard/institute";

  type ExistingProfile = {
    name?: string;
    tagline?: string;
    bio?: string;
    images?: string[];
    services?: string[];
    conditions?: string[];
    weeklyHours?: Record<string, { open: string; close: string } | null>;
    contact?: Record<string, string>;
    details?: Record<string, string>;
  };

  /**
   * Recognizes an already-registered provider/institute account: the profile
   * is looked up by the authenticated Firebase UID, and any previously saved
   * data means the user should not repeat onboarding steps.
   */
  const checkProviderProfile = async (): Promise<
    { kind: "complete" } | { kind: "incomplete"; profile: ExistingProfile } | { kind: "unknown" }
  > => {
    const headers = await authedApiHeaders();
    if (!headers) return { kind: "unknown" };
    try {
      const response = await fetch("/api/provider-profile", { headers, cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== "object") return { kind: "unknown" };
      const profile = (body as { profile?: ExistingProfile | null }).profile;
      if (!profile) return { kind: "unknown" };
      const hasData = Boolean(
        (profile.name ?? "").trim() ||
          (profile.bio ?? "").trim() ||
          (profile.tagline ?? "").trim() ||
          (profile.images?.length ?? 0) > 0 ||
          (profile.services?.length ?? 0) > 0 ||
          Object.keys(profile.weeklyHours ?? {}).length > 0,
      );
      return hasData ? { kind: "complete" } : { kind: "incomplete", profile };
    } catch {
      return { kind: "unknown" };
    }
  };

  /** Prefills the onboarding steps with values already saved on the profile. */
  const applyProfileToSteps = (profile: ExistingProfile) => {
    if (role === "provider") {
      setProviderDetails((current) => ({
        ...current,
        displayName: current.displayName || profile.name || "",
        title: current.title || profile.tagline || "",
        email: current.email || profile.contact?.email || "",
        phone: current.phone || profile.contact?.phone || "",
      }));
    } else if (role === "institute") {
      setOrgDetails((current) => ({
        ...current,
        name: current.name || profile.name || "",
        email: current.email || profile.contact?.email || "",
        phone: current.phone || profile.contact?.phone || "",
        website: current.website || profile.details?.website || "",
        foundedYear: current.foundedYear || profile.details?.foundedYear || "",
        registration: current.registration || profile.details?.registrationNumber || "",
      }));
    }
    if (profile.services?.length) setSelectedServices(profile.services);
    if (profile.conditions?.length) setSelectedConditions(profile.conditions);
    if (profile.weeklyHours && Object.keys(profile.weeklyHours).length > 0) {
      setWeeklyHours(profile.weeklyHours);
    }
  };

  // Returning users who already completed onboarding go straight to the dashboard.
  useEffect(() => {
    if (role !== "parent") return;

    // Fast path: a completed onboarding remembered on this device redirects
    // immediately, without waiting for Firebase to initialize.
    try {
      const raw = window.localStorage.getItem("bluehope.authUser");
      const stored = raw ? (JSON.parse(raw) as { uid?: string }) : null;
      if (stored?.uid && isParentOnboardingCompleteSync(stored.uid)) {
        router.replace("/dashboard/parent");
        return;
      }
    } catch {
      // Ignore malformed storage and fall through to the auth listener.
    }

    const auth = getFirebaseAuth();
    if (!auth) return;

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || cancelled) return;

      window.localStorage.setItem(
        "bluehope.authUser",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName ?? "",
          email: user.email ?? "",
          photoURL: user.photoURL ?? "",
        }),
      );
      setAuthUser({ uid: user.uid, name: user.displayName ?? "", email: user.email ?? "" });

      const completed = await isParentOnboardingComplete(user.uid);
      if (!cancelled && completed) {
        router.replace("/dashboard/parent");
        return;
      }

      // Signed in but onboarding not finished: resume at the details step
      // instead of repeating the intro and sign-in steps.
      if (!cancelled) {
        setStep((current) => (current < 2 ? 2 : current));
        setBasicInfo((current) => ({
          ...current,
          email: current.email || user.email || "",
          firstName: current.firstName || (user.displayName ?? "").split(" ")[0] || "",
          lastName:
            current.lastName ||
            (user.displayName ?? "").split(" ").slice(1).join(" "),
        }));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [role, router]);

  // Provider/institute: recognize returning registered accounts. A signed-in
  // user with a saved profile goes straight to the dashboard; a signed-in
  // user without one resumes after the sign-in step with saved values.
  useEffect(() => {
    if (role === "parent") return;
    const auth = getFirebaseAuth();
    if (!auth) return;

    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || cancelled) return;

      window.localStorage.setItem(
        "bluehope.authUser",
        JSON.stringify({
          uid: user.uid,
          name: user.displayName ?? "",
          email: user.email ?? "",
          photoURL: user.photoURL ?? "",
        }),
      );
      setAuthUser({ uid: user.uid, name: user.displayName ?? "", email: user.email ?? "" });

      const resume = await checkProviderProfile();
      if (cancelled) return;
      if (resume.kind === "complete") {
        router.replace(dashboardPath);
        return;
      }
      if (resume.kind === "incomplete") {
        applyProfileToSteps(resume.profile);
      }
      setStep((current) => (current < signInStep + 1 ? signInStep + 1 : current));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, router]);

  const filteredConditions = useMemo(() => {
    const query = conditionQuery.trim().toLowerCase();
    const pool = role === "parent" ? conditions : conditions.slice(0, 14);

    if (!query) return pool.slice(0, role === "parent" ? 12 : 10);

    return pool
      .filter((condition) =>
        [condition.name, condition.description, ...condition.subcategories.map((item) => item.name)]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 12);
  }, [conditionQuery, role]);

  const toggleCondition = (id: string) => {
    setSelectedConditionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const accountRoleFor: Record<Role, SelfServeAccountRole> = {
    parent: "customer",
    provider: "soleProvider",
    institute: "institution",
  };

  const signInWithGoogle = async () => {
    try {
      const keyIssue = await getFirebaseWebKeyIssue();
      if (keyIssue) {
        setAuthMessage(keyIssue);
        return;
      }

      const auth = getFirebaseAuth();

      if (!auth) {
        setAuthMessage(
          "Firebase is not configured on this device yet. Add valid Firebase Web App values to .env.local to enable Google sign-in.",
        );
        return;
      }

      setAuthMessage("Opening Google sign-in...");
      const outcome = await signInWithGoogleAndEstablishRole(accountRoleFor[role]);

      if (outcome.kind === "conflict") {
        setRoleConflict(outcome.existingRole);
        setAuthMessage("");
        return;
      }

      if (outcome.kind === "error") {
        setAuthMessage(outcome.message);
        return;
      }

      setAuthUser({
        uid: outcome.uid,
        name: outcome.displayName ?? "BlueHope member",
        email: outcome.email ?? "",
      });
      setRoleConflict(null);

      // Existing parents skip the questionnaire and land on their dashboard.
      setAuthMessage("Checking your account...");
      setCheckingAccount(true);
      try {
        if (role === "parent" && (await isParentOnboardingComplete(outcome.uid))) {
          router.replace("/dashboard/parent");
          return;
        }
      } finally {
        setCheckingAccount(false);
      }

      setBasicInfo((current) => ({
        ...current,
        email: current.email || outcome.email || "",
        firstName: current.firstName || (outcome.displayName ?? "").split(" ")[0] || "",
        lastName: current.lastName || (outcome.displayName ?? "").split(" ").slice(1).join(" "),
      }));

      if (role !== "parent") {
        // Recognize accounts that already registered as this role: jump to
        // the dashboard, or resume after sign-in with their saved details.
        setAuthMessage("Checking your account...");
        setCheckingAccount(true);
        try {
          const resume = await checkProviderProfile();
          if (resume.kind === "complete") {
            router.replace(dashboardPath);
            return;
          }
          if (resume.kind === "incomplete") {
            applyProfileToSteps(resume.profile);
          }
          } finally {
            setCheckingAccount(false);
          }
        setStep((current) => (current < signInStep + 1 ? signInStep + 1 : current));
      }

      setAuthMessage("Google sign-in completed.");
    } catch {
      setAuthMessage("We couldn't complete Google sign-in right now. Please try again.");
    }
  };

  const validateCurrentStep = () => {
    if (step === signInStep && !authUser) {
      setAuthMessage("Please continue with Google before moving ahead.");
      return false;
    }

    if (role === "parent" && step === 2) {
      const nextErrors: Record<string, string> = {};
      if (!basicInfo.firstName.trim()) nextErrors.firstName = "First name is required.";
      if (!basicInfo.lastName.trim()) nextErrors.lastName = "Last name is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicInfo.email)) nextErrors.email = "Enter a valid email address.";
      if (!/^[0-9+\-\s()]{8,}$/.test(basicInfo.phone)) nextErrors.phone = "Enter a valid phone number.";
      if (supportFor === "family" && !basicInfo.relationship) nextErrors.relationship = "Select a relationship.";
      if (supportFor === "family" && !basicInfo.age) nextErrors.age = "Age is required.";
      setFieldErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    }

    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setStep((value) => Math.min(copy.steps.length - 1, value + 1));
  };

  const finishOnboarding = async () => {
    if (role === "parent") {
      setSaving(true);
      setSaveStatus("");
      try {
        const user = getFirebaseAuth()?.currentUser;
        if (user) {
          const result = await saveParentOnboarding(user.uid, {
            supportFor,
            firstName: basicInfo.firstName,
            lastName: basicInfo.lastName,
            email: basicInfo.email,
            phone: basicInfo.phone,
            relationship: basicInfo.relationship,
            age: basicInfo.age,
            conditionIds: selectedConditionIds,
            locationText,
            locationSource: locationMeta.source,
            locationCapturedAt: locationMeta.capturedAt,
          });
          setSaveStatus(
            result === "saved"
              ? "Your details were saved to your account."
              : "Saved on this device. Cloud sync activates once Firestore is enabled for the project.",
          );
        }
      } finally {
        setSaving(false);
      }
    } else {
      // Provider/institute: persist the collected onboarding details to the
      // caller's own profile so the next visit is recognized as registered.
      setSaving(true);
      setSaveStatus("");
      try {
        const headers = await authedApiHeaders();
        if (headers) {
          const payload =
            role === "provider"
              ? {
                  name:
                    providerDetails.displayName ||
                    `${providerDetails.firstName} ${providerDetails.lastName}`.trim(),
                  tagline: providerDetails.title,
                  services: selectedServices,
                  conditions: selectedConditions,
                  weeklyHours,
                  contact: { email: providerDetails.email, phone: providerDetails.phone },
                }
              : {
                  name: orgDetails.name,
                  services: selectedServices,
                  conditions: selectedConditions,
                  weeklyHours,
                  contact: { email: orgDetails.email, phone: orgDetails.phone },
                  details: {
                    website: orgDetails.website,
                    foundedYear: orgDetails.foundedYear,
                    registrationNumber: orgDetails.registration,
                    orgType: orgDetails.orgType,
                  },
                };
          const response = await fetch("/api/provider-profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(payload),
          });
          setSaveStatus(
            response.ok
              ? "Your details were saved to your account."
              : "We couldn't save everything just now — you can complete this later under Edit Profile.",
          );
        }
      } finally {
        setSaving(false);
      }
    }
    router.push(dashboardPath);
  };

  return (
    <main className="min-h-screen bg-soft-blue lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-[1560px] gap-5 px-4 py-4 sm:px-6 lg:h-screen lg:min-h-0 lg:grid-cols-[0.58fr_1fr] lg:py-5">
        <aside className="flex flex-col justify-between rounded-[8px] bg-white p-6 shadow-card lg:min-h-0">
          <div>
            <BlueHopeLogo className="scale-[0.82] origin-left" />
            <h1 className="mt-10 max-w-lg text-3xl font-extrabold leading-tight text-slate-950 xl:text-[42px]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">{copy.subtitle}</p>
            <div className="mt-8 space-y-4">
              {["Trusted & reviewed", "Find support near you", "Save and shortlist"].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-bluehope">
                    <LocateFixed className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">{item}</p>
                    <p className="text-sm text-slate-600">Built around calm, privacy-aware discovery.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 hidden h-40 rounded-[8px] bg-slate-100 lg:block xl:h-48" />
        </aside>

        <section className="flex min-h-0 items-center">
          <Card className="flex h-full max-h-[calc(100vh-40px)] w-full flex-col p-6 sm:p-8">
            <div className="text-center">
              <Badge tone="blue">{copy.steps[step]}</Badge>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-950 xl:text-4xl">
                {role === "parent" && "Sign up for "}
                {role === "provider" && "Provider setup for "}
                {role === "institute" && "Institute setup for "}
                <span className="text-bluehope">BlueHope</span>
              </h2>
              <p className="mt-2 text-slate-500">Step {step + 1} of {copy.steps.length}</p>
            </div>
            <div className="mt-6 h-2 rounded-full bg-slate-100">
              <motion.div
                className="h-2 rounded-full bg-bluehope"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
              />
            </div>

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${role}-${step}`}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {roleConflict ? (
                    <RoleConflictScreen existingRole={roleConflict} />
                  ) : role === "parent" ? (
                    <ParentStep
                      step={step}
                      supportFor={supportFor}
                      onSupportForChange={setSupportFor}
                      authUser={authUser}
                      authMessage={authMessage}
                      onGoogleSignIn={signInWithGoogle}
                      basicInfo={basicInfo}
                      onBasicInfoChange={(key, value) => {
                        setBasicInfo((current) => ({ ...current, [key]: value }));
                        setFieldErrors((current) => ({ ...current, [key]: "" }));
                      }}
                      fieldErrors={fieldErrors}
                      conditionQuery={conditionQuery}
                      onConditionQueryChange={setConditionQuery}
                      selectedConditionIds={selectedConditionIds}
                      conditionsToShow={filteredConditions}
                      onToggleCondition={toggleCondition}
                      locationText={locationText}
                      onLocationTextChange={setLocationText}
                      onLocationMetaChange={setLocationMeta}
                    />
                  ) : role === "provider" ? (
                    <ProviderStep
                      step={step}
                      authUser={authUser}
                      authMessage={authMessage}
                      onGoogleSignIn={signInWithGoogle}
                      details={providerDetails}
                      onDetailsChange={(patch) =>
                        setProviderDetails((current) => ({ ...current, ...patch }))
                      }
                      selectedServices={selectedServices}
                      selectedConditions={selectedConditions}
                      onToggleService={(item) =>
                        setSelectedServices((current) =>
                          current.includes(item)
                            ? current.filter((entry) => entry !== item)
                            : [...current, item],
                        )
                      }
                      onToggleCondition={(item) =>
                        setSelectedConditions((current) =>
                          current.includes(item)
                            ? current.filter((entry) => entry !== item)
                            : [...current, item],
                        )
                      }
                      weeklyHours={weeklyHours}
                      onWeeklyHoursChange={setWeeklyHours}
                      locationText={locationText}
                      onLocationTextChange={setLocationText}
                      onLocationMetaChange={setLocationMeta}
                    />
                  ) : (
                    <InstituteStep
                      step={step}
                      authUser={authUser}
                      authMessage={authMessage}
                      onGoogleSignIn={signInWithGoogle}
                      details={orgDetails}
                      onDetailsChange={(patch) =>
                        setOrgDetails((current) => ({ ...current, ...patch }))
                      }
                      selectedServices={selectedServices}
                      onToggleService={(item) =>
                        setSelectedServices((current) =>
                          current.includes(item)
                            ? current.filter((entry) => entry !== item)
                            : [...current, item],
                        )
                      }
                      weeklyHours={weeklyHours}
                      onWeeklyHoursChange={setWeeklyHours}
                      locationText={locationText}
                      onLocationTextChange={setLocationText}
                      onLocationMetaChange={setLocationMeta}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-3">
              <Button
                variant="outline"
                disabled={step === 0 || checkingAccount || saving}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {step < copy.steps.length - 1 ? (
                <Button
                  onClick={goNext}
                  // The sign-in step cannot be passed until Google sign-in has
                  // fully completed and the account/role is established.
                  disabled={
                    checkingAccount ||
                    saving ||
                    Boolean(roleConflict) ||
                    (step === signInStep && !authUser)
                  }
                  title={
                    step === signInStep && !authUser
                      ? "Sign in with Google to continue"
                      : undefined
                  }
                >
                  {checkingAccount ? "Checking..." : "Continue"}
                  {!checkingAccount ? <ChevronRight className="h-4 w-4" /> : null}
                </Button>
              ) : (
                <Button onClick={finishOnboarding} disabled={saving}>
                  {saving ? "Saving..." : "Go to BlueHope"}
                  {!saving ? <ChevronRight className="h-4 w-4" /> : null}
                </Button>
              )}
            </div>
            {saveStatus ? (
              <p className="mt-2 text-center text-xs font-medium text-slate-500">{saveStatus}</p>
            ) : null}
          </Card>
        </section>
      </div>
    </main>
  );
}

function ParentStep({
  step,
  supportFor,
  onSupportForChange,
  authUser,
  authMessage,
  onGoogleSignIn,
  basicInfo,
  onBasicInfoChange,
  fieldErrors,
  conditionQuery,
  onConditionQueryChange,
  selectedConditionIds,
  conditionsToShow,
  onToggleCondition,
  locationText,
  onLocationTextChange,
  onLocationMetaChange,
}: {
  step: number;
  supportFor: "myself" | "family";
  onSupportForChange: (value: "myself" | "family") => void;
  authUser: { uid: string; name: string; email: string } | null;
  authMessage: string;
  onGoogleSignIn: () => void;
  basicInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    relationship: string;
    age: string;
  };
  onBasicInfoChange: (key: keyof typeof basicInfo, value: string) => void;
  fieldErrors: Record<string, string>;
  conditionQuery: string;
  onConditionQueryChange: (value: string) => void;
  selectedConditionIds: string[];
  conditionsToShow: typeof conditions;
  onToggleCondition: (id: string) => void;
  locationText: string;
  onLocationTextChange: (value: string) => void;
  onLocationMetaChange?: (meta: {
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
  }) => void;
}) {
  if (step === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Myself", value: "myself" as const },
          { label: "A family member", value: "family" as const },
        ].map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSupportForChange(option.value)}
            className={cn(
              "relative rounded-[12px] border p-6 text-left transition",
              supportFor === option.value ? "border-bluehope bg-blue-50 shadow-soft" : "border-slate-200 bg-white",
            )}
          >
            <User className="h-8 w-8 text-bluehope" />
            {supportFor === option.value ? (
              <span className="absolute right-4 top-4 rounded-full bg-bluehope p-1 text-white">
                <Check className="h-4 w-4" />
              </span>
            ) : null}
            <p className="mt-5 text-xl font-bold">{option.label}</p>
            <p className="mt-2 text-sm text-slate-600">Personalize support without a long medical questionnaire.</p>
          </motion.button>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return <SignInCard authUser={authUser} authMessage={authMessage} onGoogleSignIn={onGoogleSignIn} />;
  }

  if (step === 2) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          value={basicInfo.firstName}
          onChange={(value) => onBasicInfoChange("firstName", value)}
          placeholder="First name"
          error={fieldErrors.firstName}
        />
        <Field
          value={basicInfo.lastName}
          onChange={(value) => onBasicInfoChange("lastName", value)}
          placeholder="Last name"
          error={fieldErrors.lastName}
        />
        <Field
          value={basicInfo.email}
          onChange={(value) => onBasicInfoChange("email", value)}
          placeholder="Email address"
          type="email"
          error={fieldErrors.email}
        />
        <Field
          value={basicInfo.phone}
          onChange={(value) => onBasicInfoChange("phone", value)}
          placeholder="Phone number"
          type="tel"
          error={fieldErrors.phone}
        />
        {supportFor === "family" ? (
          <>
            <div>
              <BlueSelect
                value={basicInfo.relationship}
                onChange={(value) => onBasicInfoChange("relationship", value)}
                placeholder="Select relationship"
                ariaLabel="Relationship"
                options={[
                  { value: "child", label: "Child" },
                  { value: "sibling", label: "Sibling" },
                  { value: "relative", label: "Relative" },
                  { value: "other", label: "Other" },
                ]}
              />
              {fieldErrors.relationship ? <p className="mt-2 text-xs font-semibold text-rose-600">{fieldErrors.relationship}</p> : null}
            </div>
            <Field
              value={basicInfo.age}
              onChange={(value) => onBasicInfoChange("age", value)}
              placeholder="Age"
              type="number"
              error={fieldErrors.age}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-5">
        <h3 className="text-xl font-bold">What condition or support need are you looking for help with?</h3>
        <p className="mt-2 text-slate-600">Select multiple options. This is for discovery, not diagnosis.</p>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={conditionQuery}
            onChange={(event) => onConditionQueryChange(event.target.value)}
            placeholder="Search autism, speech delay, sensory, learning support..."
            className="pl-12"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {conditionsToShow.map((condition) => {
              const selected = selectedConditionIds.includes(condition.id);
              return (
                <motion.button
                  key={condition.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onToggleCondition(condition.id)}
                  className={cn(
                    "flex min-h-[82px] gap-3 rounded-[12px] border p-4 text-left transition",
                    selected ? "border-bluehope bg-blue-50 shadow-card" : "border-slate-200 bg-white hover:border-blue-200",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      selected ? "border-bluehope bg-bluehope text-white" : "border-slate-300",
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>
                    <span className="font-semibold">{condition.name}</span>
                    <span className="block text-xs capitalize text-slate-500">
                      {condition.category.replace("_", " ")}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <LocationStep
      locationText={locationText}
      onLocationTextChange={onLocationTextChange}
      onLocationMetaChange={onLocationMetaChange}
    />
  );
}

function SignInCard({
  authUser,
  authMessage,
  onGoogleSignIn,
}: {
  authUser: { uid: string; name: string; email: string } | null;
  authMessage: string;
  onGoogleSignIn: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-5">
      <div className="rounded-[16px] border border-blue-100 bg-white p-7 text-center shadow-soft">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-bluehope">
          <LogIn className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Sign in to BlueHope</h3>
        <p className="mt-2 text-sm text-slate-600">
          Continue with Google to securely connect this account to BlueHope. Your profile, enquiries, and appointments
          stay linked to one identity.
        </p>
        <Button className="mt-6 w-full bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50" onClick={onGoogleSignIn}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
            G
          </span>
          Continue with Google
        </Button>
        {authUser ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-[12px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
          >
            Signed in as {authUser.email || authUser.name}
          </motion.div>
        ) : null}
        {authMessage ? (
          <p className={cn("mt-4 text-sm font-medium", authUser ? "text-emerald-700" : "text-bluehope")}>
            {authMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
      {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
    </label>
  );
}

type WeeklyHours = Record<string, { open: string; close: string } | null>;

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

function ProviderStep({
  step,
  authUser,
  authMessage,
  onGoogleSignIn,
  details,
  onDetailsChange,
  selectedServices,
  selectedConditions,
  onToggleService,
  onToggleCondition,
  weeklyHours,
  onWeeklyHoursChange,
  locationText,
  onLocationTextChange,
  onLocationMetaChange,
}: {
  step: number;
  authUser: { uid: string; name: string; email: string } | null;
  authMessage: string;
  onGoogleSignIn: () => void;
  details: {
    firstName: string;
    lastName: string;
    displayName: string;
    title: string;
    email: string;
    phone: string;
  };
  onDetailsChange: (patch: Partial<{
    firstName: string;
    lastName: string;
    displayName: string;
    title: string;
    email: string;
    phone: string;
  }>) => void;
  selectedServices: string[];
  selectedConditions: string[];
  onToggleService: (item: string) => void;
  onToggleCondition: (item: string) => void;
  weeklyHours: WeeklyHours;
  onWeeklyHoursChange: (value: WeeklyHours) => void;
  locationText: string;
  onLocationTextChange: (value: string) => void;
  onLocationMetaChange?: (meta: {
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
  }) => void;
}) {
  if (step === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          value={details.firstName}
          onChange={(event) => onDetailsChange({ firstName: event.target.value })}
          placeholder="First name"
        />
        <Input
          value={details.lastName}
          onChange={(event) => onDetailsChange({ lastName: event.target.value })}
          placeholder="Last name"
        />
        <Input
          value={details.displayName}
          onChange={(event) => onDetailsChange({ displayName: event.target.value })}
          placeholder="Display / professional name"
        />
        <Input
          value={details.title}
          onChange={(event) => onDetailsChange({ title: event.target.value })}
          placeholder="Professional title"
        />
        <Input
          value={details.email}
          onChange={(event) => onDetailsChange({ email: event.target.value })}
          placeholder="Email"
          type="email"
        />
        <Input
          value={details.phone}
          onChange={(event) => onDetailsChange({ phone: event.target.value })}
          placeholder="Phone"
          type="tel"
        />
      </div>
    );
  }

  if (step === 1) {
    return <SignInCard authUser={authUser} authMessage={authMessage} onGoogleSignIn={onGoogleSignIn} />;
  }

  if (step === 2) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <CheckboxGrid
          title="Services provided"
          items={services.map((service) => service.name)}
          selected={selectedServices}
          onToggle={onToggleService}
        />
        <CheckboxGrid
          title="Conditions supported"
          items={conditions.slice(0, 10).map((condition) => condition.name)}
          selected={selectedConditions}
          onToggle={onToggleCondition}
        />
      </div>
    );
  }

  if (step === 3) {
    return <CredentialStep />;
  }

  if (step === 4) {
    return <OpeningHoursStep value={weeklyHours} onChange={onWeeklyHoursChange} />;
  }

  return (
    <LocationStep
      provider
      locationText={locationText}
      onLocationTextChange={onLocationTextChange}
      onLocationMetaChange={onLocationMetaChange}
    />
  );
}

function InstituteStep({
  step,
  authUser,
  authMessage,
  onGoogleSignIn,
  details,
  onDetailsChange,
  selectedServices,
  onToggleService,
  weeklyHours,
  onWeeklyHoursChange,
  locationText,
  onLocationTextChange,
  onLocationMetaChange,
}: {
  step: number;
  authUser: { uid: string; name: string; email: string } | null;
  authMessage: string;
  onGoogleSignIn: () => void;
  details: {
    name: string;
    email: string;
    phone: string;
    representative: string;
    designation: string;
    website: string;
    gst: string;
    registration: string;
    foundedYear: string;
    orgType: string;
  };
  onDetailsChange: (patch: Partial<{
    name: string;
    email: string;
    phone: string;
    representative: string;
    designation: string;
    website: string;
    gst: string;
    registration: string;
    foundedYear: string;
    orgType: string;
  }>) => void;
  selectedServices: string[];
  onToggleService: (item: string) => void;
  weeklyHours: WeeklyHours;
  onWeeklyHoursChange: (value: WeeklyHours) => void;
  locationText: string;
  onLocationTextChange: (value: string) => void;
  onLocationMetaChange?: (meta: {
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
  }) => void;
}) {
  // Institute flow: Google sign-in happens first (step 0) so the Firebase UID
  // exists before any institute profile data is collected or created.
  if (step === 0) {
    return <SignInCard authUser={authUser} authMessage={authMessage} onGoogleSignIn={onGoogleSignIn} />;
  }

  if (step === 1) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          value={details.name}
          onChange={(event) => onDetailsChange({ name: event.target.value })}
          placeholder="Organization name"
        />
        <Input
          value={details.email}
          onChange={(event) => onDetailsChange({ email: event.target.value })}
          placeholder="Official email"
          type="email"
        />
        <Input
          value={details.phone}
          onChange={(event) => onDetailsChange({ phone: event.target.value })}
          placeholder="Phone number"
          type="tel"
        />
        <Input
          value={details.representative}
          onChange={(event) => onDetailsChange({ representative: event.target.value })}
          placeholder="Representative name"
        />
        <Input
          value={details.designation}
          onChange={(event) => onDetailsChange({ designation: event.target.value })}
          placeholder="Representative designation"
        />
        <Input
          value={details.website}
          onChange={(event) => onDetailsChange({ website: event.target.value })}
          placeholder="Website"
        />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          value={details.gst}
          onChange={(event) => onDetailsChange({ gst: event.target.value })}
          placeholder="GST number"
        />
        <Input
          value={details.registration}
          onChange={(event) => onDetailsChange({ registration: event.target.value })}
          placeholder="Business registration information"
        />
        <Input
          value={details.foundedYear}
          onChange={(event) => onDetailsChange({ foundedYear: event.target.value })}
          placeholder="Founded year"
        />
        <BlueSelect
          value={details.orgType}
          onChange={(value) => onDetailsChange({ orgType: value })}
          placeholder="Select organization type"
          ariaLabel="Organization type"
          options={[
            { value: "therapy-center", label: "Therapy center" },
            { value: "special-school", label: "Special school" },
            { value: "ngo", label: "NGO" },
            { value: "developmental-center", label: "Developmental center" },
          ]}
        />
      </div>
    );
  }

  if (step === 3) {
    return (
      <CheckboxGrid
        title="Institute services"
        items={services.map((service) => service.name)}
        selected={selectedServices}
        onToggle={onToggleService}
      />
    );
  }

  if (step === 4) {
    return <OpeningHoursStep value={weeklyHours} onChange={onWeeklyHoursChange} />;
  }

  return (
    <LocationStep
      provider
      locationText={locationText}
      onLocationTextChange={onLocationTextChange}
      onLocationMetaChange={onLocationMetaChange}
    />
  );
}

function OpeningHoursStep({
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
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold">Set weekly opening hours</h3>
        <p className="mt-2 text-sm text-slate-600">
          These are operating hours. Appointment slots are managed separately from the dashboard.
        </p>
      </div>
      <div className="grid gap-3">
        {DAY_KEYS.map((day) => {
          const hours = value[day] ?? null;
          const closed = !hours;
          return (
            <div key={day} className="grid gap-3 rounded-[12px] border border-slate-200 p-4 sm:grid-cols-[140px_1fr_auto] sm:items-center">
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
    </div>
  );
}

function CheckboxGrid({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.slice(0, 10).map((item) => {
          const isSelected = selected.includes(item);
          return (
          <motion.button
            key={item}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onToggle(item)}
            className={cn(
              "flex gap-3 rounded-[12px] border p-3 text-left text-sm transition",
              isSelected ? "border-bluehope bg-blue-50" : "border-slate-200 bg-white",
            )}
          >
            <span className={cn("h-4 w-4 rounded border", isSelected ? "border-bluehope bg-bluehope" : "border-slate-300")} />
            {item}
          </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CredentialStep() {
  return (
    <div className="space-y-5">
      <BlueSelect
        placeholder="Do you have a relevant degree or certification?"
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input placeholder="Degree / certificate name" />
        <Input placeholder="Institution / issuing organization" />
        <Input placeholder="Country" />
        <Input placeholder="Year of completion" />
      </div>
      <div className="rounded-[8px] border border-dashed border-bluehope bg-blue-50 p-8 text-center">
        <FileUp className="mx-auto h-10 w-10 text-bluehope" />
        <p className="mt-3 font-bold">Upload a clear, readable image or PDF of your certificate.</p>
        <p className="mt-1 text-sm text-slate-600">Allowed files: JPG, PNG, PDF. Private by default.</p>
      </div>
    </div>
  );
}

function LocationStep({
  provider = false,
  locationText,
  onLocationTextChange,
  onLocationMetaChange,
}: {
  provider?: boolean;
  locationText?: string;
  onLocationTextChange?: (value: string) => void;
  onLocationMetaChange?: (meta: {
    source: "browser_geolocation" | "manual" | null;
    capturedAt: string | null;
  }) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [permissionHint, setPermissionHint] = useState("");

  const [manualArea, setManualArea] = useState("");

  // Edge (and other Chromium browsers) may have geolocation permanently
  // denied from an earlier visit, in which case getCurrentPosition fails
  // silently or never shows a prompt. Detect the permission state up front
  // so the user gets clear guidance instead of a frozen screen.
  useEffect(() => {
    let ignore = false;
    try {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((permission) => {
            if (ignore) return;
            if (permission.state === "denied") {
              setPermissionHint(
                "Location access is blocked for this site in your browser settings. Enable it in the site permissions (padlock icon), then try again — or enter your area manually below.",
              );
              setStatus("error");
            }
          })
          .catch(() => undefined);
      }
    } catch {
      // Permissions API unavailable: fall through to the regular flow.
    }
    return () => {
      ignore = true;
    };
  }, []);

  const requestLocation = () => {
    if (window.isSecureContext === false) {
      setStatus("error");
      onLocationTextChange?.(
        "Location requires a secure connection. Open BlueHope over HTTPS or localhost, or enter your area manually below.",
      );
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      onLocationTextChange?.("Location is not available in this browser. Enter your area manually below.");
      return;
    }

    setStatus("loading");
    onLocationTextChange?.("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus("done");
        onLocationMetaChange?.({
          source: "browser_geolocation",
          capturedAt: new Date().toISOString(),
        });
        const fallback = `Current location captured: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
          );
          const data = (await response.json()) as { display_name?: string; address?: Record<string, string> };
          const address = data.address;
          const readable = [
            address?.suburb ?? address?.neighbourhood ?? address?.village ?? address?.town ?? address?.city,
            address?.state,
            address?.country,
          ]
            .filter(Boolean)
            .join(", ");

          onLocationTextChange?.(readable ? `Current location captured: ${readable}` : data.display_name ?? fallback);
        } catch {
          onLocationTextChange?.(fallback);
        }
      },
      (error) => {
        setStatus("error");
        const reason =
          error.code === 1
            ? "We couldn't access your location — permission was denied. Allow access in your browser site settings, then try again, or enter your area manually."
            : error.code === 3
              ? "We couldn't access your location — it took too long. Please try again or enter your area manually."
              : "We couldn't access your location. Please try again, or enter your area manually.";
        onLocationTextChange?.(reason);
      },
      // Explicit timeout: Edge sometimes never resolves the default request.
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  return (
    <div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[12px] bg-soft-blue p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-bluehope shadow-card">
          <LocateFixed className="h-8 w-8" />
        </span>
        <h3 className="mt-4 text-xl font-bold">Use my current location</h3>
        <p className="mt-2 text-slate-600">
          {provider
            ? "We use your location to show your services to families nearby, while keeping home-based precision private."
            : "Location helps BlueHope recommend nearby providers without continuously tracking you."}
        </p>
        <Button className="mt-6" onClick={requestLocation} disabled={status === "loading"}>
          {status === "loading" ? "Getting your location…" : "Request location permission"}
        </Button>
        {permissionHint ? (
          <p className="mt-4 text-sm font-medium text-rose-600">{permissionHint}</p>
        ) : null}
        {locationText ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("mt-4 text-sm font-medium", status === "done" ? "text-emerald-700" : "text-rose-600")}
          >
            {locationText}
          </motion.p>
        ) : null}
        {status === "error" ? (
          <Button variant="outline" className="mt-3" onClick={requestLocation}>
            Try Again
          </Button>
        ) : null}
        <div className="mt-5 w-full max-w-sm">
          <Input
            value={manualArea}
            onChange={(event) => {
              setManualArea(event.target.value);
              setStatus("idle");
              onLocationTextChange?.(event.target.value);
              onLocationMetaChange?.({
                source: event.target.value ? "manual" : null,
                capturedAt: event.target.value ? new Date().toISOString() : null,
              });
            }}
            placeholder="Or type your area / locality manually"
            aria-label="Manual location entry"
          />
          <p className="mt-2 text-xs text-slate-500">
            Manually entered areas are stored as user-provided information, not verified location data.
          </p>
        </div>
      </div>
      {provider ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {["In-clinic", "At-home", "Online"].map((mode) => (
            <label key={mode} className="flex gap-3 rounded-[8px] border border-slate-200 p-4">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-bluehope" />
              {mode}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}