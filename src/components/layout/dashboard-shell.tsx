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
  "My Enquires": ShieldCheck,
  Appointments: CalendarCheck,
  Messages: MessageSquare,
  Notifications: Bell,
  Resources: FileText,
  "My Children": Users,
  "Profile Settings": Settings,
  "My Profile": Search,
  Services: Heart,
  Enquires: CalendarCheck,
  "Reviews & Ratings": Star,
  Gallery: ImageIcon,
  Availability: CalendarCheck,
  Users,
  Providers: Users,
  "Services & Categories": Search,
  Reports: FileText,
  Settings,
} as const;

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
                href="#"
                className={cn(
                  "flex h-14 items-center gap-4 rounded-[8px] px-5 text-base font-medium text-slate-600",
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
            <div className="flex h-12 flex-1 max-w-2xl items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm text-slate-500">
              <Search className="h-5 w-5" />
              Search by service, therapy, condition or provider
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <Bell className="h-6 w-6" />
              <Heart className="h-6 w-6" />
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
