"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import Icon from "@/components/Icon";
import Image from "next/image";

const quickAccessItems = [
  { icon: "checklist", label: "Checklists", href: "/dashboard/checklists", accent: false },
  { icon: "payments", label: "Budget", href: "/dashboard/budget", accent: false },
  { icon: "group", label: "Guests", href: "/dashboard/guests", accent: false },
  { icon: "storefront", label: "Vendors", href: "/dashboard/vendors", accent: false },
  { icon: "timeline", label: "Timeline", href: "/dashboard/timeline", accent: false },
];

interface DashboardData {
  wedding: {
    id: string;
    partnerName1: string;
    partnerName2: string;
    weddingDate: string | null;
    culturalStyle: string;
    totalBudget: number;
    daysUntilWedding: number | null;
  };
  guests: {
    total: number;
    attending: number;
    notComing: number;
    noResponse: number;
  };
  budget: {
    total: number;
    estimated: number;
    actual: number;
    paid: number;
    remaining: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  upcomingEvents: {
    id: string;
    name: string;
    date: string;
    startTime: string | null;
    venue: string | null;
    dayLabel: string | null;
  }[];
  recentGuests: {
    id: string;
    name: string;
    rsvpStatus: string;
    familySide: string | null;
    createdAt: string;
  }[];
  vendorCount: number;
  unreadNotifications: number;
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatEventDate(dateStr);
}

function daysUntilEvent(dateStr: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateStr);
  eventDate.setHours(0, 0, 0, 0);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `in ${diffDays} days`;
}

function getFutureEvents(events: DashboardData["upcomingEvents"]): DashboardData["upcomingEvents"] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return events
    .filter((e) => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() >= now.getTime();
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/* Small inline floral accent for headings */
function FloralAccentImg({ className }: { className?: string }) {
  return (
    <>
      <Image src="/images/floral-accent.png"
        alt=""
        className={`inline-block pointer-events-none select-none ${className ?? ''}`}
        style={{ opacity: 0.4 }} width={1024} height={1024} />
    </>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpWidth, setRsvpWidth] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const json: DashboardData = await res.json();
      setData(json);
    } catch {
      // silently fail - user sees loading skeleton then nothing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Animate RSVP progress bar once data arrives
  useEffect(() => {
    if (!data) return;
    const percentage =
      data.guests.total > 0
        ? Math.round((data.guests.attending / data.guests.total) * 100)
        : 0;
    const timer = setTimeout(() => setRsvpWidth(percentage), 300);
    return () => clearTimeout(timer);
  }, [data]);

  // Countdown timer
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!data?.wedding.weddingDate) return;

    const weddingDate = new Date(data.wedding.weddingDate);

    const update = () => {
      const now = new Date();
      const diff = weddingDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown({ days, hours, minutes });
    };

    update();
    const interval = setInterval(update, 60_000); // update every minute
    return () => clearInterval(interval);
  }, [data?.wedding.weddingDate]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 bg-surface-container-high rounded-2xl w-1/2" />
        <div className="h-64 bg-surface-container-high rounded-3xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-24 bg-surface-container-high rounded-2xl" />
          <div className="h-24 bg-surface-container-high rounded-2xl" />
          <div className="h-24 bg-surface-container-high rounded-2xl" />
        </div>
      </div>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] ?? "there";
  const rsvpPercentage =
    data && data.guests.total > 0
      ? Math.round((data.guests.attending / data.guests.total) * 100)
      : 0;
  const todoLeft = data ? data.tasks.todo + data.tasks.inProgress : 0;
  const futureEvents = data?.upcomingEvents ? getFutureEvents(data.upcomingEvents) : [];

  return (
    <div className="space-y-6 page-enter relative">
      {/* ─── Decorative Background Blur Circles ─── */}
      <div className="absolute top-20 -left-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[600px] -right-24 w-64 h-64 bg-primary-container/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-1/4 w-56 h-56 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Welcome Header ─── */}
      <section className="animate-fade-in-up relative">
        <div className="flex items-center gap-3">
          <h1 className="font-headline text-5xl md:text-6xl text-on-surface leading-tight">
            {session?.user?.userType === "PLANNER" && data?.wedding ? (
              <>Plan for {data.wedding.partnerName1} and {data.wedding.partnerName2}</>
            ) : (
              <>Welcome, {userName}</>
            )}
          </h1>
          <FloralAccentImg className="w-8 h-8 hidden md:block translate-y-1" />
        </div>
        <p className="mt-2 italic text-on-surface-variant/70 font-body text-base">
          {session?.user?.userType === "PLANNER"
            ? "Their journey to the aisle, beautifully managed."
            : "Your journey to the aisle continues beautifully."}
        </p>
      </section>

      {/* ─── Countdown Section ─── */}
      <section className="relative rounded-3xl bg-surface-container-low flex flex-col items-center justify-center py-10 px-4 sm:px-6 ambient-shadow ghost-border overflow-hidden">
        {/* Decorative gold lines top and bottom */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Radial glow behind countdown */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[250px] bg-primary/[0.04] rounded-full blur-2xl" />
        </div>

        <p className="uppercase tracking-[0.3em] text-primary/60 text-xs font-label mb-10 relative z-10">
          Counting Down to the Big Day
        </p>

        <div className="flex items-center gap-3 sm:gap-4 md:gap-8 relative z-10 w-full justify-center">
          {/* Days */}
          <div className="flex flex-col items-center animate-float delay-100 flex-1 max-w-[120px] sm:max-w-none sm:flex-none">
            <div className="bg-surface-container-lowest rounded-2xl shadow-xl px-4 py-4 sm:px-6 sm:py-5 md:px-10 md:py-8 ghost-border w-full text-center">
              <span className="font-headline text-3xl sm:text-4xl md:text-6xl text-primary leading-none">
                {countdown.days}
              </span>
            </div>
            <span className="mt-3 uppercase text-[10px] tracking-widest text-on-surface-variant font-label">
              Days
            </span>
          </div>

          {/* Separator */}
          <span className="font-headline text-2xl sm:text-3xl md:text-5xl text-primary/30 -mt-6 animate-pulse shrink-0">:</span>

          {/* Hours */}
          <div className="flex flex-col items-center animate-float delay-300 flex-1 max-w-[120px] sm:max-w-none sm:flex-none">
            <div className="bg-surface-container-lowest rounded-2xl shadow-xl px-4 py-4 sm:px-6 sm:py-5 md:px-10 md:py-8 ghost-border w-full text-center">
              <span className="font-headline text-3xl sm:text-4xl md:text-6xl text-primary leading-none">
                {String(countdown.hours).padStart(2, "0")}
              </span>
            </div>
            <span className="mt-3 uppercase text-[10px] tracking-widest text-on-surface-variant font-label">
              Hours
            </span>
          </div>

          {/* Separator */}
          <span className="font-headline text-2xl sm:text-3xl md:text-5xl text-primary/30 -mt-6 animate-pulse shrink-0">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center animate-float delay-500 flex-1 max-w-[120px] sm:max-w-none sm:flex-none">
            <div className="bg-surface-container-lowest rounded-2xl shadow-xl px-4 py-4 sm:px-6 sm:py-5 md:px-10 md:py-8 ghost-border w-full text-center">
              <span className="font-headline text-3xl sm:text-4xl md:text-6xl text-primary leading-none">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
            </div>
            <span className="mt-3 uppercase text-[10px] tracking-widest text-on-surface-variant font-label">
              Minutes
            </span>
          </div>
        </div>
      </section>

      {/* ─── Main Grid ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {/* ─── Left Column ─── */}
        <div className="lg:col-span-7 space-y-6">
          {/* RSVP Summary Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 ambient-shadow ghost-border transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-container/30">
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-headline text-2xl text-on-surface">RSVP Summary</h2>
              <Icon name="mail" className="text-primary/40" />
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              {data?.guests.attending ?? 0} of {data?.guests.total ?? 0} guests confirmed
            </p>

            {/* Progress Bar with shimmer */}
            <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
              <div
                className="gold-gradient h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${rsvpWidth}%` }}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-on-surface-variant font-label">
                Attendance Rate
              </span>
              <span className="text-sm font-semibold text-primary font-label">
                {rsvpPercentage}%
              </span>
            </div>
          </div>

          {/* Triple Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Budget Spent */}
            <div className="bg-surface-container-lowest rounded-3xl p-5 lg:p-6 ambient-shadow ghost-border text-center transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-container/30 animate-fade-in-up delay-100">
              <Icon name="account_balance_wallet" className="text-primary/40 text-2xl mb-2" />
              <p className="font-headline text-2xl xl:text-3xl text-primary mt-1 break-words">
                {formatCurrency(data?.budget.paid ?? 0)}
              </p>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
                Budget Spent
              </p>
            </div>

            {/* Total Budget */}
            <div className="bg-surface-container-lowest rounded-3xl p-5 lg:p-6 ambient-shadow ghost-border text-center transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-container/30 animate-fade-in-up delay-200">
              <Icon name="savings" className="text-primary/40 text-2xl mb-2" />
              <p className="font-headline text-2xl xl:text-3xl text-on-surface mt-1 break-words">
                {formatCurrency(data?.budget.total ?? 0)}
              </p>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
                Total Budget
              </p>
            </div>

            {/* To-Do Left */}
            <div className="bg-surface-container-lowest rounded-3xl p-5 lg:p-6 ambient-shadow ghost-border text-center transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-container/30 animate-fade-in-up delay-300">
              <Icon name="pending_actions" className="text-primary/40 text-2xl mb-2" />
              <p className="font-headline text-2xl xl:text-3xl text-on-surface mt-1">{todoLeft}</p>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
                To-Do Left
              </p>
            </div>
          </div>

          {/* Next Milestones */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 ambient-shadow ghost-border">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              Next Milestones
            </h2>

            {futureEvents.length > 0 ? (
              <div className="relative pl-8">
                {/* Vertical gold line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] gold-gradient rounded-full" />

                <div className="space-y-8">
                  {futureEvents.map((event, index) => (
                    <div key={event.id} className="relative flex items-start gap-4 animate-fade-in-up" style={{ animationDelay: `${(index + 1) * 200}ms` }}>
                      {/* Circle node */}
                      <div className="absolute -left-8 top-0.5 w-6 h-6 rounded-full gold-gradient flex items-center justify-center shadow-md">
                        <Icon name="event" className="text-white text-xs" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-headline text-lg text-on-surface">
                            {event.name}
                          </p>
                          <span className="text-xs font-label text-primary bg-primary-container/15 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {daysUntilEvent(event.date)}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant font-label mt-0.5">
                          {event.dayLabel ?? formatEventDate(event.date)}
                          {event.venue && ` \u2022 ${event.venue}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="celebration" className="text-4xl text-primary/30 mb-3" />
                <p className="text-base text-on-surface-variant font-headline">
                  All events completed! Time to celebrate.
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-1 font-label">
                  Your planning milestones are all done.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Access Grid */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
            <h2 className="font-headline text-2xl text-on-surface mb-5">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
              {quickAccessItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 hover:border-primary-container/30 hover-glow ${
                    item.accent
                      ? "gold-gradient text-white shadow-lg hover:shadow-xl hover:scale-[1.03]"
                      : "bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container/10 ghost-border"
                  }`}
                >
                  <Icon name={item.icon} className="text-2xl" />
                  <span className="text-xs font-label font-medium tracking-wide">
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
            <h2 className="font-headline text-2xl text-on-surface mb-5">
              Recent Activity
            </h2>

            <div className="space-y-5">
              {data?.recentGuests && data.recentGuests.length > 0 ? (
                data.recentGuests.map((guest) => (
                  <div key={guest.id} className="flex items-start gap-4">
                    {/* Icon Circle */}
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                      <Icon name={guest.rsvpStatus === "ATTENDING"
                          ? "check_circle"
                          : guest.rsvpStatus === "NOT_COMING"
                          ? "cancel"
                          : "mail"} className="text-lg text-primary" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface">
                        {guest.name}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {guest.rsvpStatus === "ATTENDING"
                          ? "Confirmed attendance"
                          : guest.rsvpStatus === "NOT_COMING"
                          ? "Declined invitation"
                          : "Awaiting response"}
                        {guest.familySide && ` \u2022 ${guest.familySide} side`}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-1 font-label">
                        {timeAgo(guest.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant italic">
                  No recent activity yet.
                </p>
              )}
            </div>

            {/* View All */}
            <button
              onClick={() => router.push("/dashboard/guests")}
              className="w-full mt-6 py-3 rounded-2xl border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all duration-300"
            >
              View All Activity
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
