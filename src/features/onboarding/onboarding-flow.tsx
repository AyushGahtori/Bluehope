"use client";

import { useMemo, useState } from "react";
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
import { signInWithPopup } from "firebase/auth";
import { BlueHopeLogo } from "@/components/brand/logo";
import { Badge, BlueSelect, Button, Card, Input, LinkButton } from "@/components/ui/primitives";
import { getFirebaseAuth, googleProvider } from "@/config/firebase";
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
    steps: ["Basic info", "Services", "Credentials", "Location"],
  },
  institute: {
    title: "Set up your institute profile",
    subtitle: "List your organization, services, and future branch structure.",
    steps: ["Organization", "Business", "Services", "Locations"],
  },
} satisfies Record<Role, { title: string; subtitle: string; steps: string[] }>;

export function OnboardingFlow({ role }: { role: Role }) {
  const [step, setStep] = useState(0);
  const [supportFor, setSupportFor] = useState<"myself" | "family">("family");
  const [authUser, setAuthUser] = useState<{ name: string; email: string } | null>(null);
  const [authMessage, setAuthMessage] = useState("");
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
  const progress = ((step + 1) / copy.steps.length) * 100;
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

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();

    if (!auth) {
      setAuthMessage("Firebase is not configured on this device yet. Add .env.local values to enable Google sign-in.");
      return;
    }

    try {
      setAuthMessage("Opening Google sign-in...");
      const result = await signInWithPopup(auth, googleProvider);
      const signedInUser = {
        name: result.user.displayName ?? "BlueHope Parent",
        email: result.user.email ?? "",
      };
      localStorage.setItem("bluehope.authUser", JSON.stringify(signedInUser));
      setAuthUser(signedInUser);
      setBasicInfo((current) => ({
        ...current,
        email: current.email || signedInUser.email,
        firstName: current.firstName || signedInUser.name.split(" ")[0] || "",
        lastName: current.lastName || signedInUser.name.split(" ").slice(1).join(" "),
      }));
      setAuthMessage("Google sign-in completed.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Google sign-in could not be completed.");
    }
  };

  const validateCurrentStep = () => {
    if (role === "parent" && step === 1 && !authUser) {
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
                  {role === "parent" ? (
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
                    />
                  ) : role === "provider" ? (
                    <ProviderStep step={step} />
                  ) : (
                    <InstituteStep step={step} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-3">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {step < copy.steps.length - 1 ? (
                <Button onClick={goNext}>
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <LinkButton href={role === "parent" ? "/dashboard/parent" : role === "provider" ? "/dashboard/provider" : "/dashboard/admin"}>
                  Go to BlueHope
                </LinkButton>
              )}
            </div>
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
}: {
  step: number;
  supportFor: "myself" | "family";
  onSupportForChange: (value: "myself" | "family") => void;
  authUser: { name: string; email: string } | null;
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
    return (
      <div className="mx-auto max-w-md py-5">
        <div className="rounded-[16px] border border-blue-100 bg-white p-7 text-center shadow-soft">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-bluehope">
            <LogIn className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-2xl font-extrabold text-slate-950">Sign in to BlueHope</h3>
          <p className="mt-2 text-sm text-slate-600">
            Continue with Google so your parent profile, saved providers, enquiries, and appointments stay linked to
            your account.
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
          {authMessage && !authUser ? <p className="mt-4 text-sm font-medium text-bluehope">{authMessage}</p> : null}
        </div>
      </div>
    );
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

  return <LocationStep />;
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

function ProviderStep({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input placeholder="First name" />
        <Input placeholder="Last name" />
        <Input placeholder="Display / professional name" />
        <Input placeholder="Professional title" />
        <Input placeholder="Email" />
        <Input placeholder="Phone" />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <CheckboxGrid title="Services provided" items={services.map((service) => service.name)} />
        <CheckboxGrid title="Conditions supported" items={conditions.slice(0, 10).map((condition) => condition.name)} />
      </div>
    );
  }

  if (step === 2) {
    return <CredentialStep />;
  }

  return <LocationStep provider />;
}

function InstituteStep({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input placeholder="Organization name" />
        <Input placeholder="Official email" />
        <Input placeholder="Phone number" />
        <Input placeholder="Representative name" />
        <Input placeholder="Representative designation" />
        <Input placeholder="Website" />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input placeholder="GST number" />
        <Input placeholder="Business registration information" />
        <Input placeholder="Founded year" />
        <Input placeholder="Number of locations" />
        <BlueSelect
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

  if (step === 2) {
    return <CheckboxGrid title="Institute services" items={services.map((service) => service.name)} />;
  }

  return <LocationStep provider />;
}

function CheckboxGrid({ title, items }: { title: string; items: string[] }) {
  const [selectedItems, setSelectedItems] = useState(items.slice(0, 3));

  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.slice(0, 10).map((item) => {
          const selected = selectedItems.includes(item);
          return (
          <motion.button
            key={item}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              setSelectedItems((current) =>
                current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
              )
            }
            className={cn(
              "flex gap-3 rounded-[12px] border p-3 text-left text-sm transition",
              selected ? "border-bluehope bg-blue-50" : "border-slate-200 bg-white",
            )}
          >
            <span className={cn("h-4 w-4 rounded border", selected ? "border-bluehope bg-bluehope" : "border-slate-300")} />
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

function LocationStep({ provider = false }: { provider?: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [locationText, setLocationText] = useState("");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setLocationText("Location is not available in this browser.");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus("done");
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

          setLocationText(readable ? `Current location captured: ${readable}` : data.display_name ?? fallback);
        } catch {
          setLocationText(fallback);
        }
      },
      () => {
        setStatus("error");
        setLocationText("Location permission was not granted. You can try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
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
          {status === "loading" ? "Requesting..." : "Request location permission"}
        </Button>
        {locationText ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("mt-4 text-sm font-medium", status === "done" ? "text-emerald-700" : "text-rose-600")}
          >
            {locationText}
          </motion.p>
        ) : null}
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
