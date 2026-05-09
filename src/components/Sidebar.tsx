"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getPlanLabel, FREE_PATHS } from "@/lib/plans";
import Icon from "@/components/Icon";
import Image from "next/image";

const navItems = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
  { icon: "restaurant", label: "Allergies & Diets", href: "/dashboard/allergies" },
  { icon: "brush", label: "Beauty", href: "/dashboard/beauty" },
  { icon: "payments", label: "Budget", href: "/dashboard/budget" },
  { icon: "restaurant_menu", label: "Catering", href: "/dashboard/catering" },
  { icon: "checklist", label: "Checklists", href: "/dashboard/checklists" },
  { icon: "group", label: "Guest List", href: "/dashboard/guests" },
  { icon: "palette", label: "Mood Board", href: "/dashboard/moodboard" },
  { icon: "checkroom", label: "Outfits", href: "/dashboard/outfits" },
  { icon: "event_seat", label: "Seating", href: "/dashboard/seating" },
  { icon: "assignment", label: "Tasks", href: "/dashboard/tasks" },
  { icon: "timeline", label: "Timeline", href: "/dashboard/timeline" },
  { icon: "storefront", label: "Vendors", href: "/dashboard/vendors" },
  { icon: "rate_review", label: "Feedback", href: "/dashboard/feedback" },
  { icon: "download", label: "Export", href: "/dashboard/export" },
  { icon: "settings", label: "Settings", href: "/dashboard/settings" },
  { icon: "new_releases", label: "Coming Soon", href: "/dashboard/coming-soon" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userPlan = session?.user?.plan;
  const isFreeUser = !userPlan;
  const planLabel = getPlanLabel(userPlan);

  const isPlanner = session?.user?.userType === "PLANNER";
  const [activeClientName, setActiveClientName] = useState<string | null>(null);

  useEffect(() => {
    if (isPlanner && session?.user?.weddingId) {
      fetch("/api/planner/clients")
        .then((res) => (res.ok ? res.json() : null))
        .then((clients) => {
          if (Array.isArray(clients)) {
            const active = clients.find(
              (c: { id: string }) => c.id === session.user.weddingId
            );
            if (active) {
              setActiveClientName(active.clientName);
            }
          }
        })
        .catch(() => {});
    } else {
      setActiveClientName(null);
    }
  }, [isPlanner, session?.user?.weddingId]);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col border-r border-primary-container/15 bg-background z-50">
      {/* Back to Planner link */}
      {isPlanner && (
        <div className="px-4 pt-4">
          <Link
            href="/planner"
            className="flex items-center gap-1.5 text-xs font-label text-primary hover:text-primary/80 transition-colors"
          >
            <Icon name="arrow_back" className="text-sm" />
            Back to Planner
          </Link>
        </div>
      )}

      {/* Logo */}
      <div className="p-8 animate-fade-in">
        <Link href="/dashboard">
          <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-16 w-auto" width={400} height={400} />
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mt-1 font-label">
          Wedding Planning
        </p>
      </div>

      {/* Active client indicator for planners */}
      {isPlanner && activeClientName && (
        <div className="px-8 -mt-4 mb-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-primary/80 font-label bg-primary/5 rounded-lg px-3 py-1.5 text-center">
            Managing: {activeClientName}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const isLocked = isFreeUser && !FREE_PATHS.has(item.href);

          if (isLocked) {
            return (
              <Link
                key={item.href}
                href="/dashboard/subscription"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant/35 cursor-pointer transition-all duration-200 hover:text-on-surface-variant/50 hover:bg-surface-container/30 group"
                title="Upgrade to unlock"
              >
                <Icon name={item.icon} />
                <span className="font-headline tracking-wide flex-1">{item.label}</span>
                <Icon name="lock" className="text-sm opacity-60 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary font-bold border-l-4 border-primary bg-primary-fixed/20"
                  : "text-on-surface-variant/70 hover:text-primary hover:bg-primary-fixed/10"
              }`}
            >
              <Icon name={item.icon} />
              <span className="font-headline tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade prompt for free users */}
      {isFreeUser && (
        <div className="mx-4 mb-3">
          <Link
            href="/dashboard/subscription"
            className="block p-3 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name="workspace_premium" className="text-primary text-base" />
              <span className="text-xs font-label font-semibold text-primary">
                Upgrade Plan
              </span>
            </div>
            <p className="text-[10px] font-label text-on-surface-variant leading-relaxed">
              Unlock all features including guests, vendors, seating, and more.
            </p>
          </Link>
        </div>
      )}

      {/* User Profile */}
      <div className="p-6 border-t border-primary-container/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
            <Icon name="person" className="text-primary text-lg" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-on-surface truncate">
              {session?.user?.name ?? "Guest"}
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
              {planLabel}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
          >
            <Icon name="logout" className="text-lg" />
          </button>
        </div>
      </div>
    </aside>
  );
}
