"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { getPlanLabel } from "@/lib/plans";
import Icon from "@/components/Icon";
import Image from "next/image";

interface ClientWedding {
  id: string;
  clientName: string;
  weddingDate: string | null;
  guestCount: number;
  taskCount: number;
}

const navItems = [
  { icon: "dashboard", label: "Dashboard", href: "/planner" },
  { icon: "group", label: "Clients", href: "/planner/clients" },
  { icon: "card_membership", label: "Subscription", href: "/planner/subscription" },
  { icon: "rate_review", label: "Feedback", href: "/planner/feedback" },
  { icon: "settings", label: "Settings", href: "/planner/settings" },
  { icon: "new_releases", label: "Coming Soon", href: "/planner/coming-soon" },
];

export default function PlannerSidebar() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const [clients, setClients] = useState<ClientWedding[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const planLabel = getPlanLabel(session?.user?.plan);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/planner/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(data);
        }
      } catch {
        // Silently fail — sidebar should not break the page
      } finally {
        setLoadingClients(false);
      }
    }
    fetchClients();
  }, []);

  const handleSwitchWedding = async (weddingId: string) => {
    setSwitching(weddingId);
    try {
      await fetch("/api/planner/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId }),
      });
      await update(); // refresh session
      window.location.href = "/dashboard"; // full reload to pick up new weddingId
    } catch {
      setSwitching(null);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col border-r border-primary-container/15 bg-background z-50">
      {/* Logo */}
      <div className="p-8 animate-fade-in">
        <Link href="/planner">
          <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-16 w-auto" width={400} height={400} />
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mt-1 font-label">
          Wedding Planner
        </p>
      </div>

      {/* User Info */}
      <div className="px-6 pb-4">
        <p className="text-sm font-semibold text-on-surface truncate">
          {session?.user?.name ?? "Planner"}
        </p>
        <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
          {planLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/planner"
              ? pathname === "/planner"
              : pathname.startsWith(item.href);

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

      {/* Wedding Switcher */}
      <div className="flex-1 px-4 mt-6 overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-[10px] uppercase tracking-[0.15em] font-label font-semibold text-on-surface-variant/60">
            Client Weddings
          </span>
          <span className="text-[10px] font-label text-on-surface-variant/40">
            {clients.length}
          </span>
        </div>

        {loadingClients ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <p className="text-xs font-label text-on-surface-variant/50 px-2">
            No clients yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {clients.map((client) => {
              const isActiveWedding = session?.user?.weddingId === client.id;
              return (
                <div
                  key={client.id}
                  className={`rounded-xl p-3 transition-all duration-200 ${
                    isActiveWedding
                      ? "bg-primary-fixed/20 border border-primary/20"
                      : "bg-surface-container-lowest ghost-border hover:bg-surface-container-low/50"
                  }`}
                >
                  <p className={`text-xs font-label font-medium truncate ${
                    isActiveWedding ? "text-primary" : "text-on-surface"
                  }`}>
                    {client.clientName}
                  </p>
                  {client.weddingDate && (
                    <p className="text-[10px] font-label text-on-surface-variant mt-0.5">
                      {new Date(client.weddingDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <button
                    onClick={() => handleSwitchWedding(client.id)}
                    disabled={switching === client.id || isActiveWedding}
                    className={`mt-2 text-[10px] font-label font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                      isActiveWedding
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/5 text-primary hover:bg-primary/15"
                    }`}
                  >
                    {switching === client.id ? "Switching..." : isActiveWedding ? "Active" : "Manage"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Client link */}
        <Link
          href="/planner/clients"
          className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl text-on-surface-variant/60 hover:text-primary hover:bg-primary-fixed/10 transition-all duration-200"
        >
          <Icon name="add" className="text-sm" />
          <span className="text-xs font-label font-medium">Add Client</span>
        </Link>
      </div>

      {/* User Profile + Logout */}
      <div className="p-6 border-t border-primary-container/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center">
            <Icon name="person" className="text-primary text-lg" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-on-surface truncate">
              {session?.user?.name ?? "Planner"}
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
              {planLabel}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-1.5 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          >
            <Icon name="logout" className="text-lg" />
          </button>
        </div>
      </div>
    </aside>
  );
}
