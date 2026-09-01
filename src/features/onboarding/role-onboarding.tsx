"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  ChevronRight,
  HeartHandshake,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { Badge, LinkButton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/domain";

const roles = [
  {
    id: "parent",
    href: "/onboarding/parent",
    title: "Parent / Family Member",
    description: "Find support for yourself or someone you care for.",
    icon: HeartHandshake,
    tone: "bg-blue-50 text-bluehope",
  },
  {
    id: "provider",
    href: "/onboarding/provider",
    title: "Sole Provider",
    description: "Offer your specialized services to families.",
    icon: Stethoscope,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "institute",
    href: "/onboarding/institute",
    title: "Institute / Organization",
    description: "List and manage your organization's services.",
    icon: Building2,
    tone: "bg-amber-50 text-amber-600",
  },
] as const;

export function RoleOnboarding() {
  const [selected, setSelected] = useState<Role>("parent");
  const selectedRole = roles.find((role) => role.id === selected) ?? roles[0];
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-screen bg-soft-blue">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <BlueHopeLogo />
          <div className="hidden items-center gap-3 text-sm text-slate-600 sm:flex">
            Already have an account?
            <LinkButton
              href="/dashboard/parent"
              variant="ghost"
              className="h-10 px-3"
            >
              Log in
            </LinkButton>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bluehope-enter">
            <Badge tone="blue">Foundation MVP</Badge>
            <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-tight text-slate-950">
              Welcome to <span className="text-bluehope">BlueHope</span>
            </h1>
            <p className="mt-5 max-w-lg text-xl leading-8 text-slate-600">
              Find the right support. Offer the right care.
            </p>
            <div className="mt-10 grid max-w-xl gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = selected === role.id;
                const transition = reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

                return (
                  <motion.button
                    key={role.id}
                    whileHover={reduceMotion ? undefined : { y: -1 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.995 }}
                    onClick={() => setSelected(role.id)}
                    className={cn(
                      "group relative flex items-center gap-5 overflow-hidden rounded-[8px] border p-5 text-left shadow-card transition-colors duration-200",
                      isSelected
                        ? "border-[#bfd5ff]"
                        : "border-slate-200 hover:border-blue-200",
                    )}
                  >
                    <motion.span
                      aria-hidden="true"
                      initial={false}
                      animate={
                        isSelected
                          ? { scaleX: 1, opacity: 1 }
                          : { scaleX: 0, opacity: 0 }
                      }
                      transition={transition}
                      className="absolute inset-y-0 left-0 w-full origin-left bg-[#2d7df6]"
                    />

                    <span
                      className={cn(
                        "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] z-10 transition-colors duration-300",
                        isSelected ? "bg-white/16 text-white" : role.tone,
                      )}
                    >
                      <Icon className="h-8 w-8" />
                    </span>

                    <span className="relative z-10 min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-lg font-bold transition-colors duration-300",
                          isSelected ? "text-white" : "text-slate-950",
                        )}
                      >
                        {role.title}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-sm transition-colors duration-300",
                          isSelected ? "text-blue-50" : "text-slate-600",
                        )}
                      >
                        {role.description}
                      </span>
                    </span>

                    <ChevronRight
                      className={cn(
                        "relative z-10 h-5 w-5 transition-colors duration-300",
                        isSelected
                          ? "text-white"
                          : "text-slate-400 group-hover:text-bluehope",
                      )}
                    />
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href={selectedRole.href}>
                Continue <ChevronRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/dashboard/parent" variant="outline">
                Explore demo
              </LinkButton>
            </div>
          </div>

          <div className="bluehope-enter bluehope-lift relative overflow-hidden rounded-[8px] border border-white/80 bg-white p-7 shadow-soft">
            <div className="absolute inset-x-0 top-0 h-36 bg-bluehope" />
            <div className="relative rounded-[8px] bg-white p-6 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-bluehope">
                    BlueHope discovery
                  </p>
                  <h2 className="text-3xl font-extrabold text-slate-950">
                    Personalized support starts here
                  </h2>
                </div>
                <span className="h-14 w-14 rounded-full bg-slate-200" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Speech Therapy",
                  "Autism Support",
                  "Occupational Therapy",
                  "Special Education",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="bluehope-lift rounded-[8px] border border-slate-200 bg-slate-50 p-4 hover:border-blue-200"
                  >
                    <div
                      className={cn(
                        "mb-4 h-12 w-12 rounded-[8px]",
                        index === 0 && "bg-blue-100",
                        index === 1 && "bg-emerald-100",
                        index === 2 && "bg-purple-100",
                        index === 3 && "bg-amber-100",
                      )}
                    />
                    <p className="font-bold text-slate-950">{item}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Find services and providers
                    </p>
                  </div>
                ))}
              </div>
              <div className="bluehope-soft-pulse mt-6 rounded-[8px] bg-soft-blue p-5">
                <p className="font-semibold text-slate-950">
                  Architecture status
                </p>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span>Firebase auth ready</span>
                  <span>Firestore data model ready</span>
                  <span>Structured conditions</span>
                  <span>Search and recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
