import type { ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  FileText,
  Heart,
  Home,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { BlueHopeLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: Home,
  "Search Support": Search,
  "Saved Providers": Heart,
  "My Enquiries": ShieldCheck,
  Appointments: CalendarCheck,
  Messages: MessageSquare,
  Notifications: Bell,
  Resources: FileText,
  "My Children": Users,
  "Profile Settings": Settings,
  "My Profile": Search,
  Services: Heart,
  Enquiries: CalendarCheck,
  "Reviews & Ratings": Star,
  Gallery: ImageIcon,
  Availability: CalendarCheck,
  Users,
  Providers: Users,
  "Services & Categories": Search,
  Reports: FileText,
  Settings,
} as const;

const parentLinks: Record<string, string> = {
  Dashboard: "/dashboard/parent",
  "Search Support": "/search",
  "Saved Providers": "/dashboard/parent/saved",
  "My Enquiries": "/dashboard/parent/enquiries",
  Appointments: "/dashboard/parent/appointments",
  Messages: "/dashboard/parent/messages",
  Notifications: "/dashboard/parent/notifications",
  Resources: "/dashboard/parent/resources",
  "My Children": "/dashboard/parent/children",
  "Profile Settings": "/dashboard/parent/settings",
};

const providerLinks: Record<string, string> = {
  Dashboard: "/dashboard/provider",
  "My Profile": "/providers/wellvoice-speech-therapy",
  Services: "/dashboard/provider/services",
  Appointments: "/dashboard/provider/appointments",
  Enquiries: "/dashboard/provider/enquiries",
  "Reviews & Ratings": "/dashboard/provider/reviews",
  Messages: "/dashboard/provider/messages",
  Gallery: "/dashboard/provider/gallery",
  Availability: "/dashboard/provider/availability",
  "Profile Settings": "/dashboard/provider/settings",
};

const adminLinks: Record<string, string> = {
  Dashboard: "/dashboard/admin",
  Users: "/dashboard/admin/users",
  Providers: "/dashboard/admin/providers",
  "Services & Categories": "/dashboard/admin/services",
  Enquiries: "/dashboard/admin/enquiries",
  Appointments: "/dashboard/admin/appointments",
  "Reviews & Ratings": "/dashboard/admin/reviews",
  Messages: "/dashboard/admin/messages",
  Reports: "/dashboard/admin/reports",
  Settings: "/dashboard/admin/settings",
};

function navHref(item: string, roleLabel: string) {
  if (roleLabel.includes("Neha")) return parentLinks[item] ?? "/dashboard/parent";
  if (roleLabel.includes("Admin")) return adminLinks[item] ?? "/dashboard/admin";
  return providerLinks[item] ?? "/dashboard/provider";
}

export function DashboardShell({
  children,
  nav,
  roleLabel,
}: {
  children: ReactNode;
  nav: string[];
  roleLabel: string;
}) {
  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 hidden w-80 border-r border-slate-200 bg-slate-50 px-8 py-9 lg:block">
        <BlueHopeLogo />
        <nav className="mt-14 space-y-2">
          {nav.map((item, index) => {
            const Icon = iconMap[item as keyof typeof iconMap] ?? FileText;
            return (
              <Link
                key={item}
                href={navHref(item, roleLabel)}
                className={cn(
                  "flex h-14 items-center gap-4 rounded-[8px] px-5 text-base font-medium text-slate-600 transition hover:bg-blue-50 hover:text-bluehope",
                  index === 0 && "bg-blue-50 text-bluehope",
                )}
              >
                <Icon className="h-6 w-6" />
                {item}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-8 left-8 right-8 rounded-[8px] border border-blue-100 bg-blue-50 p-5">
          <p className="font-bold text-slate-950">Need Help?</p>
          <p className="mt-1 text-sm text-slate-600">Our support team is here to assist you.</p>
        </div>
      </aside>
      <main className="lg:pl-80">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
            <form action="/search" className="flex h-12 flex-1 max-w-2xl items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm text-slate-500 transition focus-within:border-bluehope focus-within:ring-4 focus-within:ring-blue-100">
              <Search className="h-5 w-5" />
              <input
                name="q"
                className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-500"
                placeholder="Search by service, therapy, condition or provider"
              />
              <input type="hidden" name="radius" value="20" />
            </form>
            <div className="hidden items-center gap-4 sm:flex">
              <Link href={navHref("Notifications", roleLabel)} aria-label="Notifications">
                <Bell className="h-6 w-6" />
              </Link>
              <Link href={navHref("Saved Providers", roleLabel)} aria-label="Saved providers">
                <Heart className="h-6 w-6" />
              </Link>
              <span className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="text-sm">
                <p className="font-medium text-slate-800">{roleLabel}</p>
                <p className="text-slate-500">BlueHope</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
