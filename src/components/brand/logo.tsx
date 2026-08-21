import Link from "next/link";
import { Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";

export function BlueHopeLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("relative inline-flex items-end text-bluehope", className)}>
      <span className="text-4xl font-extrabold leading-none tracking-normal">bluehope</span>
      <Puzzle className="absolute -top-4 left-[104px] h-6 w-6 rotate-12 fill-bluehope text-bluehope" />
    </Link>
  );
}
