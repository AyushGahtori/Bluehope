"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  LocateFixed,
  User,
} from "lucide-react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { Badge, Button, Card, Input, LinkButton, Select } from "@/components/ui/primitives";
import { conditions, services } from "@/data/taxonomy";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/domain";

const roleCopy = {
  parent: {
    title: "Tell us who you are looking for support for",
    subtitle: "A short, calm setup that helps personalize discovery.",
    steps: ["Support for", "Basic info", "Needs", "Location"],
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
  const copy = roleCopy[role];
  const progress = ((step + 1) / copy.steps.length) * 100;
  const selectedConditions = useMemo(() => conditions.slice(0, role === "parent" ? 9 : 12), [role]);

  return (
    <main className="min-h-screen bg-soft-blue">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="flex flex-col justify-between rounded-[8px] bg-white p-8 shadow-card">
          <div>
            <BlueHopeLogo />
            <h1 className="mt-16 text-4xl font-extrabold leading-tight text-slate-950">{copy.title}</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">{copy.subtitle}</p>
            <div className="mt-10 space-y-5">
              {["Trusted & reviewed", "Find support near you", "Save and shortlist"].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-bluehope">
                    <LocateFixed className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-950">{item}</p>
                    <p className="text-sm text-slate-600">Built around calm, privacy-aware discovery.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 h-52 rounded-[8px] bg-slate-100" />
        </aside>

        <section className="flex items-center">
          <Card className="w-full p-7 sm:p-10">
            <div className="text-center">
              <Badge tone="blue">{copy.steps[step]}</Badge>
              <h2 className="mt-4 text-4xl font-extrabold text-slate-950">
                {role === "parent" && "Sign up for "}
                {role === "provider" && "Provider setup for "}
                {role === "institute" && "Institute setup for "}
                <span className="text-bluehope">BlueHope</span>
              </h2>
              <p className="mt-2 text-slate-500">Step {step + 1} of {copy.steps.length}</p>
            </div>
            <div className="mt-8 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-bluehope" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-8 min-h-[440px]">
              {role === "parent" ? (
                <ParentStep step={step} conditionsToShow={selectedConditions} />
              ) : role === "provider" ? (
                <ProviderStep step={step} />
              ) : (
                <InstituteStep step={step} />
              )}
            </div>

            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {step < copy.steps.length - 1 ? (
                <Button onClick={() => setStep((value) => Math.min(copy.steps.length - 1, value + 1))}>
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

function ParentStep({ step, conditionsToShow }: { step: number; conditionsToShow: typeof conditions }) {
  if (step === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {["Myself", "A family member"].map((label, index) => (
          <button
            key={label}
            className={cn(
              "rounded-[8px] border p-6 text-left transition",
              index === 1 ? "border-bluehope bg-blue-50" : "border-slate-200 bg-white",
            )}
          >
            <User className="h-8 w-8 text-bluehope" />
            <p className="mt-5 text-xl font-bold">{label}</p>
            <p className="mt-2 text-sm text-slate-600">Personalize support without a long medical questionnaire.</p>
          </button>
        ))}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <Input placeholder="First name" />
        <Input placeholder="Last name" />
        <Input placeholder="Email address" type="email" />
        <Input placeholder="Phone number" type="tel" />
        <Select>
          <option>Relationship</option>
          <option>Child</option>
          <option>Sibling</option>
          <option>Relative</option>
          <option>Other</option>
        </Select>
        <Input placeholder="Age" type="number" />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div>
        <h3 className="text-xl font-bold">What condition or support need are you looking for help with?</h3>
        <p className="mt-2 text-slate-600">Select multiple options. This is for discovery, not diagnosis.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {conditionsToShow.map((condition, index) => (
            <label key={condition.id} className="flex gap-3 rounded-[8px] border border-slate-200 p-4">
              <input type="checkbox" defaultChecked={index < 3} className="mt-1 h-4 w-4 accent-bluehope" />
              <span>
                <span className="font-semibold">{condition.name}</span>
                <span className="block text-xs text-slate-500">{condition.category.replace("_", " ")}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return <LocationStep />;
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
        <Select>
          <option>Organization type</option>
          <option>Therapy center</option>
          <option>Special school</option>
          <option>NGO</option>
          <option>Developmental center</option>
        </Select>
      </div>
    );
  }

  if (step === 2) {
    return <CheckboxGrid title="Institute services" items={services.map((service) => service.name)} />;
  }

  return <LocationStep provider />;
}

function CheckboxGrid({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.slice(0, 8).map((item, index) => (
          <label key={item} className="flex gap-3 rounded-[8px] border border-slate-200 p-3 text-sm">
            <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 accent-bluehope" />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}

function CredentialStep() {
  return (
    <div className="space-y-5">
      <Select>
        <option>Do you have a relevant degree or certification?</option>
        <option>Yes</option>
        <option>No</option>
      </Select>
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
  return (
    <div>
      <div className="rounded-[8px] bg-soft-blue p-6">
        <LocateFixed className="h-10 w-10 text-bluehope" />
        <h3 className="mt-4 text-xl font-bold">Use my current location</h3>
        <p className="mt-2 text-slate-600">
          {provider
            ? "We use your location to show your services to families nearby, while keeping home-based precision private."
            : "Location helps BlueHope recommend nearby providers without continuously tracking you."}
        </p>
        <Button className="mt-5">Request location permission</Button>
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
