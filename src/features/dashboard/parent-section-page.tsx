"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarCheck,
  FileText,
  Heart,
  MessageSquare,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { demoAppointments, demoProviders } from "@/data/demo";
import { ProviderCard } from "@/features/marketplace/provider-card";
import { StoredNameField } from "@/features/dashboard/user-greeting";
import { useStoredAuthUser } from "@/lib/auth-user-store";
import { apiHeaders } from "@/lib/api-client";

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

type Enquiry = {
  id: string;
  listingName: string;
  serviceId: string;
  message: string;
  status: string;
  createdAt: string;
};

type Booking = {
  id: string;
  listingName: string;
  childName: string;
  serviceId: string;
  date: string;
  start: string;
  end: string;
  status: string;
  createdAt: string;
};

export function ParentSectionPage({ section }: { section: string }) {
  const page = pageMap[section] ?? pageMap.saved;
  const Icon = page.icon;
  const user = useStoredAuthUser();
  const firstName = user?.name?.trim().split(" ")[0];

  return (
    <DashboardShell
      nav={parentNav}
      roleLabel={firstName ? `Hi, ${firstName}` : "Hi there"}
      role="parent"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="rounded-[8px] bg-blue-50 p-4 text-bluehope">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-950">{page.title}</h1>
            <p className="mt-1 text-slate-600">
              {user ? "Your personal BlueHope workspace." : "You are browsing the BlueHope demo workspace."}
            </p>
          </div>
        </div>
        <LinkButton href="/search">Search Support</LinkButton>
      </div>
      {section === "saved" ? <SavedSection signedIn={Boolean(user)} /> : null}
      {section === "enquiries" ? <EnquiriesSection signedIn={Boolean(user)} /> : null}
      {section === "appointments" ? <AppointmentsSection signedIn={Boolean(user)} /> : null}
      {section === "messages" ? <MessagesSection signedIn={Boolean(user)} /> : null}
      {section === "notifications" ? <NotificationsSection signedIn={Boolean(user)} /> : null}
      {section === "resources" ? <ResourcesSection /> : null}
      {section === "children" ? <ChildrenSection signedIn={Boolean(user)} /> : null}
      {section === "settings" ? <SettingsSection signedIn={Boolean(user)} /> : null}
    </DashboardShell>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center p-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-bluehope">
        <Icon className="h-8 w-8" />
      </span>
      <p className="mt-5 text-xl font-extrabold text-slate-950">{title}</p>
      <p className="mt-2 max-w-md text-slate-600">{description}</p>
      <LinkButton href="/search" className="mt-6">
        Explore providers
      </LinkButton>
    </Card>
  );
}

function SavedSection({ signedIn }: { signedIn: boolean }) {
  const [savedProviders, setSavedProviders] = useState<typeof demoProviders | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let ignore = false;
    apiHeaders()
      .then((headers) => fetch("/api/saved-providers", { headers }))
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) {
          const saved: { listingSlug: string }[] = Array.isArray(data.savedProviders) ? data.savedProviders : [];
          setSavedProviders(
            saved
              .map((item) => demoProviders.find((provider) => provider.slug === item.listingSlug))
              .filter((provider): provider is (typeof demoProviders)[number] => Boolean(provider)),
          );
        }
      })
      .catch(() => {
        if (!ignore) setSavedProviders([]);
      });
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  if (!signedIn) {
    return (
      <div className="space-y-4">
        {demoProviders.slice(0, 4).map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    );
  }

  if (savedProviders === null) {
    return <Card className="p-6"><p className="text-sm text-slate-500">Loading your saved providers...</p></Card>;
  }

  if (savedProviders.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="You don't have anything saved yet"
        description="Tap the heart on a provider or institute profile and it will appear here for quick access."
      />
    );
  }

  return (
    <div className="space-y-4">
      {savedProviders.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

function EnquiriesSection({ signedIn }: { signedIn: boolean }) {
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let ignore = false;
    apiHeaders()
      .then((headers) => fetch("/api/enquiries", { headers }))
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) setEnquiries(Array.isArray(data.enquiries) ? data.enquiries : []);
      })
      .catch(() => {
        if (!ignore) setEnquiries([]);
      });
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  if (!signedIn) {
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

  return (
    <Card className="p-6">
      <SectionTitle title="Recent Enquiries" />
      {enquiries === null ? (
        <p className="py-4 text-sm text-slate-500">Loading your enquiries...</p>
      ) : enquiries.length === 0 ? (
        <EmptyStateInline
          icon={MessageSquare}
          title="No enquiries yet"
          description="Use Contact Now on a provider profile and your enquiries will show up here."
        />
      ) : (
        enquiries.map((enquiry) => (
          <div key={enquiry.id} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
            <div>
              <p className="font-bold">{enquiry.listingName}</p>
              <p className="text-sm text-slate-600">{enquiry.message}</p>
            </div>
            <Badge tone={enquiry.status === "new" ? "amber" : "green"}>
              {enquiry.status === "new" ? "New" : enquiry.status === "responded" ? "Responded" : "In progress"}
            </Badge>
          </div>
        ))
      )}
    </Card>
  );
}

function AppointmentsSection({ signedIn }: { signedIn: boolean }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let ignore = false;
    apiHeaders()
      .then((headers) => fetch("/api/bookings", { headers }))
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      })
      .catch(() => {
        if (!ignore) setBookings([]);
      });
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  if (!signedIn) {
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

  if (bookings === null) {
    return <Card className="p-6"><p className="text-sm text-slate-500">Loading your appointments...</p></Card>;
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No appointments yet"
        description="When you book a session with a provider or institute, it will appear here."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bookings.map((booking) => (
        <Card key={booking.id} className="p-5">
          <Badge tone={booking.status === "confirmed" ? "green" : "amber"}>
            {booking.status === "confirmed" ? "Confirmed" : booking.status}
          </Badge>
          <p className="mt-4 text-xl font-bold">{booking.listingName}</p>
          <p className="mt-1 text-slate-600">
            {booking.serviceId.replaceAll("-", " ")} · for {booking.childName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {booking.date} · {booking.start} - {booking.end}
          </p>
          <LinkButton href="/search" variant="outline" className="mt-5">Book another</LinkButton>
        </Card>
      ))}
    </div>
  );
}

function MessagesSection({ signedIn }: { signedIn: boolean }) {
  const [threads, setThreads] = useState<{ name: string; preview: string }[] | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let ignore = false;
    apiHeaders()
      .then((headers) => fetch("/api/enquiries", { headers }))
      .then((response) => response.json())
      .then((data) => {
        const enquiries: Enquiry[] = Array.isArray(data.enquiries) ? data.enquiries : [];
        const byListing = new Map<string, Enquiry>();
        for (const enquiry of enquiries) {
          const existing = byListing.get(enquiry.listingName);
          if (!existing || existing.createdAt < enquiry.createdAt) {
            byListing.set(enquiry.listingName, enquiry);
          }
        }
        if (!ignore) {
          setThreads(
            [...byListing.values()].map((enquiry) => ({
              name: enquiry.listingName,
              preview: enquiry.message,
            })),
          );
        }
      })
      .catch(() => {
        if (!ignore) setThreads([]);
      });
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  if (!signedIn) {
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

  return (
    <Card className="p-6">
      <SectionTitle title="Messages" />
      {threads === null ? (
        <p className="py-4 text-sm text-slate-500">Loading your messages...</p>
      ) : threads.length === 0 ? (
        <EmptyStateInline
          icon={MessageSquare}
          title="No messages yet"
          description="Conversations start when you contact a provider — your messages will appear here."
        />
      ) : (
        threads.map((thread) => (
          <div key={thread.name} className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
            <span className="h-12 w-12 rounded-full bg-blue-100" />
            <div>
              <p className="font-bold">{thread.name}</p>
              <p className="text-sm text-slate-600">{thread.preview}</p>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}

function NotificationsSection({ signedIn }: { signedIn: boolean }) {
  const [items, setItems] = useState<string[] | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let ignore = false;
    Promise.all([
      apiHeaders().then((headers) => fetch("/api/enquiries", { headers }).then((r) => r.json())),
      apiHeaders().then((headers) => fetch("/api/bookings", { headers }).then((r) => r.json())),
    ])
      .then(([enquiryData, bookingData]) => {
        const notifications: { text: string; at: string }[] = [];
        for (const enquiry of (Array.isArray(enquiryData.enquiries) ? enquiryData.enquiries : []) as Enquiry[]) {
          notifications.push({
            text:
              enquiry.status === "responded"
                ? `${enquiry.listingName} replied to your enquiry`
                : `Enquiry sent to ${enquiry.listingName}`,
            at: enquiry.createdAt,
          });
        }
        for (const booking of (Array.isArray(bookingData.bookings) ? bookingData.bookings : []) as Booking[]) {
          notifications.push({
            text: `Appointment confirmed with ${booking.listingName}`,
            at: booking.createdAt,
          });
        }
        notifications.sort((a, b) => (a.at < b.at ? 1 : -1));
        if (!ignore) setItems(notifications.map((item) => item.text));
      })
      .catch(() => {
        if (!ignore) setItems([]);
      });
    return () => {
      ignore = true;
    };
  }, [signedIn]);

  if (!signedIn) {
    return (
      <Card className="p-6">
        <SectionTitle title="Notifications" />
        {["Appointment confirmed", "Provider replied to your enquiry", "New recommended providers near Delhi"].map((item) => (
          <p key={item} className="border-b border-slate-100 py-4 font-medium last:border-0">{item}</p>
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <SectionTitle title="Notifications" />
      {items === null ? (
        <p className="py-4 text-sm text-slate-500">Loading your notifications...</p>
      ) : items.length === 0 ? (
        <EmptyStateInline
          icon={Bell}
          title="No notifications yet"
          description="Updates about your enquiries and appointments will appear here."
        />
      ) : (
        items.map((item) => (
          <p key={item} className="border-b border-slate-100 py-4 font-medium last:border-0">{item}</p>
        ))
      )}
    </Card>
  );
}

function EmptyStateInline({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-bluehope">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-extrabold text-slate-950">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>
    </div>
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

function ChildrenSection({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
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

  return (
    <Card className="p-6">
      <SectionTitle title="Child Profiles" action={<LinkButton href="/onboarding/parent" variant="outline">Add child</LinkButton>} />
      <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center">
        <UserRound className="mx-auto h-8 w-8 text-bluehope" />
        <p className="mt-3 font-bold text-slate-950">No child profiles yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Add a child profile so recommendations can match their age and support needs. Child details stay private.
        </p>
      </div>
    </Card>
  );
}

function SettingsSection({ signedIn }: { signedIn: boolean }) {
  return (
    <Card className="p-6">
      <SectionTitle title="Profile Settings" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Full name</span>
          <StoredNameField className="mt-2 h-12 w-full rounded-[12px] border border-slate-300 px-4 outline-none focus:border-bluehope" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Phone</span>
          <input
            className="mt-2 h-12 w-full rounded-[12px] border border-slate-300 px-4 outline-none focus:border-bluehope"
            defaultValue={signedIn ? "" : "+91 98765 43210"}
            placeholder={signedIn ? "Add your phone number" : undefined}
          />
        </label>
      </div>
      <LinkButton href="/dashboard/parent" className="mt-5">Save changes</LinkButton>
    </Card>
  );
}