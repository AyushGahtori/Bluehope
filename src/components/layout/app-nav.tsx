import Link from "next/link";
import { Bell, Heart, MapPin, MessageSquare, Search } from "lucide-react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/primitives";

export function AppNav({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <BlueHopeLogo className="scale-90" />
        {!dashboard ? (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-900 lg:flex">
            <Link href="/" className="underline underline-offset-4">
              HOME
            </Link>
            <Link href="/search">CATEGORIES</Link>
            <Link href="/search?q=autism">EXPLORE</Link>
            <Link href="/dashboard/parent">RESOURCES</Link>
            <Link href="/providers/wellvoice-speech-therapy">ABOUT US</Link>
            <Link href="/search">CONTACT US</Link>
          </nav>
        ) : (
          <div className="hidden h-12 flex-1 max-w-xl items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm text-slate-500 lg:flex">
            <Search className="h-5 w-5" />
            Search by service, therapy, condition or provider
          </div>
        )}
        <div className="flex items-center gap-4">
          <LinkButton href="/search?location=near-me" variant="outline" className="hidden h-11 sm:inline-flex">
            <MapPin className="h-4 w-4" />
            Near Me
          </LinkButton>
          <MessageSquare className="hidden h-6 w-6 text-slate-800 sm:block" />
          <Heart className="hidden h-6 w-6 text-slate-800 sm:block" />
          {dashboard ? <Bell className="hidden h-6 w-6 text-slate-800 sm:block" /> : null}
          <span className="hidden h-12 w-12 rounded-full bg-slate-200 sm:block" />
          {!dashboard ? (
            <>
              <LinkButton href="/dashboard/parent" variant="outline" className="hidden h-11 sm:inline-flex">
                Log In
              </LinkButton>
              <LinkButton href="/onboarding/parent" className="hidden h-11 sm:inline-flex">
                Sign Up
              </LinkButton>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
