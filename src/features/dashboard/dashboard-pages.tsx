import { Eye, PlusCircle, Star, Users, CheckCircle2, HeartPulse } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { demoAppointments } from "@/data/demo";

const parentNav = [
  "Dashboard",
  "Search Support",
  "Saved Providers",
  "My Enquiries",
  "Appointments",
  "Messages",
  "Notifications",
  "Resources",
  "My Children",
  "Profile Settings",
];

const providerNav = [
  "Dashboard",
  "My Profile",
  "Services",
  "Appointments",
  "Enquiries",
  "Reviews & Ratings",
  "Messages",
  "Gallery",
  "Availability",
  "Profile Settings",
];

const adminNav = [
  "Dashboard",
  "Users",
  "Providers",
  "Services & Categories",
  "Enquiries",
  "Appointments",
  "Reviews & Ratings",
  "Messages",
  "Reports",
  "Settings",
];

export function ParentDashboard() {
  return (
    <DashboardShell nav={parentNav} roleLabel="Hi, Neha">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card className="bg-soft-blue p-8">
          <h1 className="text-4xl font-extrabold text-slate-950">Welcome back, Neha!</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            We are here to help you find the right support for your child&apos;s unique needs.
          </p>
          <form action="/search" className="mt-6 flex gap-3 rounded-[8px] bg-white p-2">
            <input name="q" className="min-w-0 flex-1 px-4 outline-none" placeholder="What are you looking for today?" />
            <input type="hidden" name="radius" value="20" />
            <button className="rounded-lg bg-bluehope px-8 font-semibold text-white">Search</button>
          </form>
        </Card>
        <Card className="p-6">
          <SectionTitle title="Your Children" action={<LinkButton href="#" variant="ghost">View all</LinkButton>} />
          <div className="flex items-center gap-4 rounded-[8px] border border-slate-200 p-4">
            <span className="h-16 w-16 rounded-full bg-slate-200" />
            <div>
              <p className="font-bold">Aarav Sharma</p>
              <p className="text-sm text-slate-600">8 years old</p>
              <p className="text-sm text-slate-600">Autism (ASD)</p>
            </div>
          </div>
        </Card>
      </div>
      <QuickAccess />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AppointmentCard />
        <Card className="p-6">
          <SectionTitle title="Parents Community" action={<LinkButton href="#" variant="ghost">View all</LinkButton>} />
          <div className="rounded-[8px] bg-soft-blue p-5">
            <p className="text-lg font-bold text-bluehope">Community Visibility</p>
            <p className="mt-2 text-sm text-slate-600">Share your profile with parents in your area when you are ready.</p>
          </div>
          <ul className="mt-6 space-y-3 text-slate-800">
            {["Join Local Parent Communities", "Connect with families facing similar challenges", "Receive invitations to nearby support groups"].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className={index < 2 ? "h-5 w-5 rounded bg-bluehope" : "h-5 w-5 rounded border border-slate-400"} />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  );
}

export function ProviderDashboard() {
  return (
    <DashboardShell nav={providerNav} roleLabel="Dr. Priya Sharma">
      <h1 className="text-3xl font-extrabold text-slate-950">Welcome back, Dr. Priya Sharma!</h1>
      <p className="mt-2 text-slate-600">Here is what is happening with your practice today.</p>
      <MetricGrid
        items={[
          ["Total Enquires", "48", Users],
          ["Responded", "28", CheckCircle2],
          ["Appointments", "16", HeartPulse],
          ["Average Rating", "4.8", Star],
          ["Profile Views", "320", Eye],
        ]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.9fr_0.75fr]">
        <EnquiryCard />
        <AppointmentCard />
        <ProfileStatus />
      </div>
    </DashboardShell>
  );
}

export function AdminDashboard() {
  return (
    <DashboardShell nav={adminNav} roleLabel="Admin User">
      <h1 className="text-3xl font-extrabold text-slate-950">Welcome back, Admin!</h1>
      <p className="mt-2 text-slate-600">Here is what is happening across BlueHope.</p>
      <MetricGrid
        items={[
          ["Total Users", "2568", Users],
          ["Total Providers", "842", CheckCircle2],
          ["Total Enquires", "3675", HeartPulse],
          ["Total Reviews", "1926", Star],
          ["Total Page Views", "22,448", Eye],
        ]}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr_0.65fr]">
        <Card className="p-6">
      <SectionTitle title="Enquiries Overview" action={<Badge tone="neutral">Last 7 days</Badge>} />
          <div className="h-72 rounded-[8px] bg-[linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[length:100%_48px]" />
        </Card>
        <EnquiryCard />
        <Card className="p-6">
          <SectionTitle title="User registration" action={<LinkButton href="#" variant="ghost">View all</LinkButton>} />
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[18px] border-bluehope text-center">
            <span>
              <b>2568</b>
              <br />
              Total Users
            </span>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

function QuickAccess() {
  return (
    <section className="mt-7">
      <SectionTitle title="Quick Access" action={<LinkButton href="/search" variant="ghost">View all categories</LinkButton>} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Therapist", "Find services and providers", "bg-blue-50 text-bluehope", "/search?service=speech-therapy&radius=20"],
          ["Near Me", "Find services and providers", "bg-emerald-50 text-emerald-600", "/search?radius=10"],
          ["School", "Find services and providers", "bg-rose-50 text-rose-500", "/search?service=special-education&radius=20"],
          ["Doctor", "Find services and providers", "bg-amber-50 text-amber-600", "/search?service=psychological-services&radius=20"],
        ].map(([title, text, tone, href]) => (
          <Link key={title} href={href} className="block transition hover:-translate-y-0.5">
          <Card className="flex items-center gap-5 p-6">
            <span className={`flex h-20 w-20 items-center justify-center rounded-[8px] ${tone}`}>
              <PlusCircle className="h-9 w-9" />
            </span>
            <div>
              <p className="text-xl font-bold">{title}</p>
              <p className="text-sm text-slate-600">{text}</p>
            </div>
          </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MetricGrid({ items }: { items: Array<[string, string, typeof Users]> }) {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      {items.map(([label, value, Icon], index) => (
        <Card key={label} className="flex items-center gap-5 bg-slate-50 p-6">
          <span className={index % 2 ? "rounded-full bg-emerald-100 p-4 text-emerald-600" : "rounded-full bg-blue-100 p-4 text-bluehope"}>
            <Icon className="h-8 w-8" />
          </span>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-3xl font-extrabold">{value}</p>
            <p className="mt-2 text-sm text-emerald-600">+18% this month</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AppointmentCard() {
  return (
    <Card className="p-6">
      <SectionTitle title="Upcoming Appointments" action={<LinkButton href="#" variant="ghost">View all</LinkButton>} />
      <div className="space-y-4">
        {demoAppointments.map((appointment) => (
          <div key={`${appointment.date}-${appointment.name}`} className="flex items-center justify-between rounded-[8px] border border-slate-100 p-4">
            <div className="flex items-center gap-4">
              <span className="rounded-[8px] bg-slate-100 px-4 py-3 text-center font-bold">{appointment.date}</span>
              <div>
                <p className="font-bold">{appointment.name}</p>
                <p className="text-sm text-slate-600">{appointment.service}</p>
                <p className="text-sm text-slate-600">{appointment.time}</p>
              </div>
            </div>
            <Badge tone="green">Confirmed</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EnquiryCard() {
  return (
    <Card className="p-6">
      <SectionTitle title="Recent Enquiries" action={<LinkButton href="/dashboard/parent/enquiries" variant="ghost">View all</LinkButton>} />
      {["Neha Iyer", "Rahul Mehta", "Simran Kaur", "Amit Verma"].map((name, index) => (
        <div key={name} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
          <div className="flex items-center gap-4">
            <span className="h-12 w-12 rounded-full bg-purple-100" />
            <div>
              <p className="font-bold">{name}</p>
              <p className="text-sm text-slate-600">Speech Delay · 4 years old · Mumbai</p>
            </div>
          </div>
          <Badge tone={index === 0 ? "amber" : "green"}>{index === 0 ? "New" : "Requested"}</Badge>
        </div>
      ))}
    </Card>
  );
}

function ProfileStatus() {
  return (
    <Card className="p-6">
      <SectionTitle title="Profile Status" action={<Badge tone="green">Review ready</Badge>} />
      <div className="mx-auto h-24 w-24 rounded-full bg-slate-100" />
      <p className="mt-6 text-center font-bold">Your profile is 90% complete</p>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 w-[90%] rounded-full bg-bluehope" />
      </div>
      <div className="mt-6 space-y-3 text-sm text-slate-600">
        {["Basic Information", "Services Offered", "Work Experience", "Documents Uploaded"].map((item) => (
          <p key={item} className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {item}
          </p>
        ))}
      </div>
      <LinkButton href="/onboarding/provider" className="mt-6 w-full">Edit Profile</LinkButton>
    </Card>
  );
}
