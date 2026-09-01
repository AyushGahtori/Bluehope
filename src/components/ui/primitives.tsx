"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "neutral";
};

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "bluehope-lift inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:opacity-60",
        variant === "primary" && "bluehope-fill border border-bluehope bg-bluehope text-white shadow-soft hover:bg-bluehope",
        variant === "secondary" && "border border-blue-100 bg-blue-50 text-bluehope hover:border-bluehope hover:text-white",
        variant === "outline" && "bluehope-fill border border-bluehope bg-white text-bluehope",
        variant === "ghost" && "text-bluehope hover:bg-blue-50",
        variant === "neutral" && "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-blue-200 hover:bg-blue-50",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}

export function LinkButton({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonProps["variant"];
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bluehope-lift inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        variant === "primary" && "bluehope-fill border border-bluehope bg-bluehope text-white shadow-soft hover:bg-bluehope",
        variant === "secondary" && "border border-blue-100 bg-blue-50 text-bluehope hover:border-bluehope hover:text-white",
        variant === "outline" && "bluehope-fill border border-bluehope bg-white text-bluehope",
        variant === "ghost" && "text-bluehope hover:bg-blue-50",
        variant === "neutral" && "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-blue-200 hover:bg-blue-50",
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </Link>
  );
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("bluehope-enter bluehope-lift rounded-[8px] border border-slate-200 bg-white shadow-card", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "bluehope-focus-glow h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-bluehope focus:ring-4 focus:ring-blue-100",
        className,
      )}
      {...props}
    />
  );
}

export function BlueCheckbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
        className={cn(
          "group bluehope-fill flex w-full items-start gap-3 rounded-[10px] border border-transparent p-2 text-left transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60",
          checked && "text-white",
          className,
        )}
      >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          checked
            ? "border-bluehope bg-bluehope text-white shadow-sm"
            : "border-slate-300 bg-white group-hover:border-bluehope",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span> : null}
      </span>
    </button>
  );
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "bluehope-focus-glow h-12 w-full appearance-none rounded-[12px] border border-slate-300 bg-white px-4 pr-11 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-200 focus:border-bluehope focus:ring-4 focus:ring-blue-100",
          className,
        )}
        {...props}
      />
      <span className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-slate-500" />
    </div>
  );
}

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function BlueSelect({
  name,
  value,
  defaultValue = "",
  placeholder,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedValue = value ?? internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const choose = (nextValue: string) => {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className={cn(
          "group bluehope-focus-glow flex h-12 w-full items-center justify-between rounded-[12px] border border-slate-300 bg-white px-4 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 focus:border-bluehope focus:outline-none focus:ring-4 focus:ring-blue-100",
          open && "border-bluehope ring-4 ring-blue-100",
        )}
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", open && "rotate-180 text-bluehope")} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 max-h-72 overflow-auto rounded-[12px] border border-blue-100 bg-white p-1.5 shadow-soft"
            role="listbox"
          >
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  whileHover="hover"
                  onClick={() => choose(option.value)}
                  className={cn(
                    "relative flex w-full items-center justify-between overflow-hidden rounded-[10px] px-3 py-3 text-left text-sm transition",
                    selected ? "text-bluehope" : "text-slate-700",
                  )}
                >
                  <motion.span
                    variants={{
                      hover: { opacity: 1, x: "0%" },
                    }}
                    initial={{ opacity: selected ? 1 : 0, x: "-18%" }}
                    animate={{ opacity: selected ? 1 : 0, x: "0%" }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-100 via-blue-50 to-transparent"
                  />
                  <span className="relative">
                    <span className="block font-semibold">{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                    ) : null}
                  </span>
                  {selected ? <Check className="relative h-4 w-4" /> : null}
                </motion.button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Badge({
  children,
  tone = "blue",
  className,
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "purple" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold",
        tone === "blue" && "bg-blue-50 text-bluehope",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "purple" && "bg-purple-50 text-purple-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  action,
  eyebrow,
}: {
  title: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase text-bluehope">{eyebrow}</p> : null}
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}
