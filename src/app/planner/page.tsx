"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface NextWedding {
  id: string;
  clientName: string;
  weddingDate: string;
  guestCount: number;
  taskCount: number;
}

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  clientName: string;
}

interface UpcomingWedding {
  id: string;
  clientName: string;
  weddingDate: string;
  guestCount: number;
  taskCount: number;
}

interface PlannerDashboardData {
  totalClients: number;
  weddingsThisMonth: number;
  tasksDueSoon: number;
  nextWedding: NextWedding | null;
  upcomingWeddings: UpcomingWedding[];
  upcomingTasks: UpcomingTask[];
}

/* ─── Helpers ─── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCountdown(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
};

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="page-enter space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="w-56 h-8 bg-surface-container rounded-xl animate-pulse" />
        <div className="w-40 h-4 bg-surface-container rounded animate-pulse" />
      </div>

      {/* Countdown skeleton */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border h-32 animate-pulse" />

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl ghost-border h-24 animate-pulse" />
        ))}
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl ghost-border h-64 animate-pulse" />
        <div className="bg-surface-container-lowest rounded-2xl ghost-border h-64 animate-pulse" />
      </div>
    </div>
  );
}

/* ─── Countdown Component ─── */

function CountdownTimer({ targetDate, clientName, onManage }: { targetDate: string; clientName: string; onManage: () => void }) {
  const [countdown, setCountdown] = useState(getCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: "Days", value: countdown.days },
    { label: "Hours", value: countdown.hours },
    { label: "Minutes", value: countdown.minutes },
    { label: "Seconds", value: countdown.seconds },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6 border-l-4 border-l-primary relative overflow-hidden">
      {/* Subtle gold gradient accent */}
      <div className="absolute top-0 left-0 w-1 h-full gold-gradient" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-label text-on-surface-variant uppercase tracking-wider mb-1">
            Next Wedding
          </p>
          <h3 className="font-headline text-lg text-on-surface">{clientName}</h3>
          <p className="text-xs font-label text-on-surface-variant mt-0.5">
            {formatDate(targetDate)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {units.map((unit) => (
            <div key={unit.label} className="text-center">
              <p className="text-2xl font-headline text-primary">{unit.value}</p>
              <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-wider">
                {unit.label}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onManage}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function PlannerOverviewPage() {
  const { data: session, update } = useSession();
  const [data, setData] = useState<PlannerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/planner/dashboard");
        if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const handleSwitchWedding = async (weddingId: string) => {
    setSwitching(weddingId);
    try {
      await fetch("/api/planner/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId }),
      });
      await update();
      window.location.href = "/dashboard";
    } catch {
      setSwitching(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">Failed to load dashboard</h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { icon: "group", label: "Total Clients", value: data.totalClients },
    { icon: "calendar_month", label: "Weddings This Month", value: data.weddingsThisMonth },
    { icon: "assignment_late", label: "Tasks Due Soon", value: data.tasksDueSoon },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl md:text-3xl text-on-surface">
          Planner Dashboard
        </h1>
        <p className="text-sm font-label text-on-surface-variant mt-1">
          Welcome back, {session?.user?.name ?? "Planner"}
        </p>
      </div>

      {/* Next Wedding Countdown */}
      {data.nextWedding && (
        <CountdownTimer
          targetDate={data.nextWedding.weddingDate}
          clientName={data.nextWedding.clientName}
          onManage={() => handleSwitchWedding(data.nextWedding!.id)}
        />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-2xl ghost-border p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0">
                <Icon name={stat.icon} className="text-white text-xl" />
              </div>
              <span className="text-xs font-label text-on-surface-variant">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-headline text-on-surface">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — Upcoming Tasks */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="assignment_late" className="text-primary text-xl" />
            <h2 className="font-headline text-lg text-on-surface">Tasks Due Soon</h2>
          </div>

          {data.upcomingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon name="task_alt" className="text-on-surface-variant/30 text-4xl mb-2" />
              <p className="text-sm font-label text-on-surface-variant">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low/30 hover:bg-surface-container-low/50 transition-colors"
                >
                  <Icon name="radio_button_unchecked" className="text-on-surface-variant/50 text-lg mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-label font-medium text-on-surface truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.dueDate && (
                        <span className="text-[10px] font-label text-on-surface-variant">
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-label font-semibold px-2 py-0.5 rounded-full ${
                          PRIORITY_STYLES[task.priority] || "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-[10px] font-label text-on-surface-variant/60 truncate">
                        {task.clientName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column — Upcoming Weddings */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="calendar_month" className="text-primary text-xl" />
            <h2 className="font-headline text-lg text-on-surface">Upcoming Weddings</h2>
          </div>

          {data.upcomingWeddings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon name="event" className="text-on-surface-variant/30 text-4xl mb-2" />
              <p className="text-sm font-label text-on-surface-variant">No upcoming weddings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.upcomingWeddings.map((wedding) => (
                <div
                  key={wedding.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/30 hover:bg-surface-container-low/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
                    <Icon name="favorite" className="text-primary text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-label font-medium text-on-surface truncate">
                      {wedding.clientName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-label text-on-surface-variant">
                        {formatDate(wedding.weddingDate)}
                      </span>
                      <span className="text-[10px] font-label text-on-surface-variant/60">
                        {wedding.guestCount} guests
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchWedding(wedding.id)}
                    disabled={switching === wedding.id}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {switching === wedding.id ? "Switching..." : "Manage"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex justify-center pt-2">
        <Link
          href="/planner/clients"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors"
        >
          <Icon name="add" className="text-lg" />
          Add New Client
        </Link>
      </div>
    </div>
  );
}
