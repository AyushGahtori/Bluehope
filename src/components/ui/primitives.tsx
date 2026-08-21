import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:opacity-60",
        variant === "primary" && "bg-bluehope text-white shadow-soft hover:bg-bluehope-dark",
        variant === "secondary" && "bg-blue-50 text-bluehope hover:bg-blue-100",
        variant === "outline" && "border border-bluehope text-bluehope hover:bg-blue-50",
        variant === "ghost" && "text-bluehope hover:bg-blue-50",
        className,
      )}
      {...props}
    />
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        variant === "primary" && "bg-bluehope text-white shadow-soft hover:bg-bluehope-dark",
        variant === "secondary" && "bg-blue-50 text-bluehope hover:bg-blue-100",
        variant === "outline" && "border border-bluehope text-bluehope hover:bg-blue-50",
        variant === "ghost" && "text-bluehope hover:bg-blue-50",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("rounded-[8px] border border-slate-200 bg-white shadow-card", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-bluehope focus:ring-4 focus:ring-blue-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-12 w-full appearance-none rounded-[12px] border border-slate-300 bg-white px-4 pr-11 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-200 focus:border-bluehope focus:ring-4 focus:ring-blue-100",
          className,
        )}
        {...props}
      />
      <span className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-slate-500" />
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
