import Link from "next/link";
import { Bell, Heart, MapPin, MessageSquare, Search, UserRound } from "lucide-react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/primitives";

export function AppNav({ dashboard = false }: { dashboard?: boolean }) {
  const homeHref = "/dashboard/parent";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-6">
        <BlueHopeLogo href={homeHref} className="scale-90" />
        {!dashboard ? (
          <nav className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium text-slate-900 xl:gap-7 lg:flex">
            <Link href="/dashboard/parent">HOME</Link>
            <Link href="/search">CATEGORIES</Link>
            <Link href="/search?q=autism">EXPLORE</Link>
            <Link href="/dashboard/parent/resources">RESOURCES</Link>
            <Link href="/about">ABOUT US</Link>
            <Link href="/contact">CONTACT US</Link>
          </nav>
        ) : (
          <form action="/search" className="hidden h-12 flex-1 max-w-xl items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm text-slate-500 transition focus-within:border-bluehope focus-within:ring-4 focus-within:ring-blue-100 lg:flex">
            <Search className="h-5 w-5" />
            <input
              name="q"
              className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-500"
              placeholder="Search by service, therapy, condition or provider"
            />
          </form>
        )}
        <div className="flex items-center gap-4">
          <LinkButton href="/search?location=near-me" variant="outline" className="hidden h-11 sm:inline-flex">
            <MapPin className="h-4 w-4" />
            Near Me
          </LinkButton>
          <Link href="/dashboard/parent/messages" aria-label="Messages" className="hidden text-slate-800 transition hover:text-bluehope sm:block">
            <MessageSquare className="h-6 w-6" />
          </Link>
          <Link href="/dashboard/parent/saved" aria-label="Saved providers" className="hidden text-slate-800 transition hover:text-bluehope sm:block">
            <Heart className="h-6 w-6" />
          </Link>
          {dashboard ? (
            <Link href="/dashboard/parent/notifications" aria-label="Notifications" className="hidden text-slate-800 transition hover:text-bluehope sm:block">
              <Bell className="h-6 w-6" />
            </Link>
          ) : null}
          <Link
            href="/dashboard/parent/settings"
            aria-label="Profile settings"
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 transition hover:bg-blue-100 hover:text-bluehope sm:flex"
          >
            <UserRound className="h-5 w-5" />
          </Link>
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
