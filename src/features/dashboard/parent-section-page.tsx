import { CalendarCheck, FileText, Heart, MessageSquare, Search, Settings, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { demoAppointments, demoProviders } from "@/data/demo";
import { ProviderCard } from "@/features/marketplace/provider-card";

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

const pageMap: Record<string, { title: string; icon: typeof Search }> = {
  saved: { title: "Saved Providers", icon: Heart },
  enquiries: { title: "My Enquiries", icon: MessageSquare },
  appointments: { title: "Appointments", icon: CalendarCheck },
  messages: { title: "Messages", icon: MessageSquare },
  notifications: { title: "Notifications", icon: FileText },
  resources: { title: "Helpful Resources", icon: FileText },
  children: { title: "My Children", icon: UserRound },
  settings: { title: "Profile Settings", icon: Settings },
};

export function ParentSectionPage({ section }: { section: string }) {
  const page = pageMap[section] ?? pageMap.saved;
  const Icon = page.icon;

  return (
    <DashboardShell nav={parentNav} roleLabel="Hi, Neha">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="rounded-[8px] bg-blue-50 p-4 text-bluehope">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">{page.title}</h1>
            <p className="mt-1 text-slate-600">Parent workspace for testing the BlueHope marketplace flow.</p>
          </div>
        </div>
        <LinkButton href="/search">Search Support</LinkButton>
      </div>
      {section === "saved" ? <SavedSection /> : null}
      {section === "enquiries" ? <EnquiriesSection /> : null}
      {section === "appointments" ? <AppointmentsSection /> : null}
      {section === "messages" ? <MessagesSection /> : null}
      {section === "notifications" ? <NotificationsSection /> : null}
      {section === "resources" ? <ResourcesSection /> : null}
      {section === "children" ? <ChildrenSection /> : null}
      {section === "settings" ? <SettingsSection /> : null}
    </DashboardShell>
  );
}

function SavedSection() {
  return (
    <div className="space-y-4">
      {demoProviders.slice(0, 4).map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

function EnquiriesSection() {
  return (
    <Card className="p-6">
      <SectionTitle title="Recent Enquiries" />
      {demoProviders.slice(0, 6).map((provider, index) => (
        <div key={provider.id} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
          <div>
            <p className="font-bold">{provider.name}</p>
            <p className="text-sm text-slate-600">Question about {provider.title.toLowerCase()}</p>
          </div>
          <Badge tone={index % 2 ? "green" : "amber"}>{index % 2 ? "Responded" : "New"}</Badge>
        </div>
      ))}
    </Card>
  );
}

function AppointmentsSection() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {demoAppointments.map((appointment) => (
        <Card key={`${appointment.date}-${appointment.name}`} className="p-5">
          <Badge tone="green">Confirmed</Badge>
          <p className="mt-4 text-xl font-bold">{appointment.name}</p>
          <p className="mt-1 text-slate-600">{appointment.service}</p>
          <p className="mt-1 text-sm text-slate-500">{appointment.date} · {appointment.time}</p>
          <LinkButton href="/search" variant="outline" className="mt-5">Book another</LinkButton>
        </Card>
      ))}
    </div>
  );
}

function MessagesSection() {
  return (
    <Card className="p-6">
      <SectionTitle title="Messages" />
      {["WellVoice Speech Therapy", "Bright Steps Speech Therapy Center", "Sensory Nest Clinic"].map((name) => (
        <div key={name} className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
          <span className="h-12 w-12 rounded-full bg-blue-100" />
          <div>
            <p className="font-bold">{name}</p>
            <p className="text-sm text-slate-600">Thanks for reaching out. Please share a preferred slot.</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

function NotificationsSection() {
  return (
    <Card className="p-6">
      <SectionTitle title="Notifications" />
      {["Appointment confirmed", "Provider replied to your enquiry", "New recommended providers near Delhi"].map((item) => (
        <p key={item} className="border-b border-slate-100 py-4 font-medium last:border-0">{item}</p>
      ))}
    </Card>
  );
}

function ResourcesSection() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {["Parent guide to speech therapy", "Preparing for first appointment", "How BlueHope protects child data"].map((item) => (
        <Card key={item} className="p-5">
          <p className="text-lg font-bold">{item}</p>
          <p className="mt-2 text-sm text-slate-600">Short practical resource for families.</p>
        </Card>
      ))}
    </div>
  );
}

function ChildrenSection() {
  return (
    <Card className="p-6">
      <SectionTitle title="Child Profiles" action={<LinkButton href="/onboarding/parent" variant="outline">Add child</LinkButton>} />
      <div className="rounded-[8px] border border-slate-200 p-5">
        <p className="text-xl font-bold">Aarav Sharma</p>
        <p className="mt-1 text-slate-600">8 years old · Autism Spectrum Disorder · Speech support</p>
      </div>
    </Card>
  );
}

function SettingsSection() {
  return (
    <Card className="p-6">
      <SectionTitle title="Profile Settings" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Full name</span>
          <input className="mt-2 h-12 w-full rounded-[12px] border border-slate-300 px-4 outline-none focus:border-bluehope" defaultValue="Neha Sharma" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Phone</span>
          <input className="mt-2 h-12 w-full rounded-[12px] border border-slate-300 px-4 outline-none focus:border-bluehope" defaultValue="+91 98765 43210" />
        </label>
      </div>
      <LinkButton href="/dashboard/parent" className="mt-5">Save changes</LinkButton>
    </Card>
  );
}
