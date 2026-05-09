"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Icon from "@/components/Icon";
import Image from "next/image";

interface SearchResult {
  type: "guest" | "task" | "vendor" | "event" | "checklist";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const typeIcons: Record<string, string> = {
  guest: "group",
  task: "assignment",
  vendor: "storefront",
  event: "timeline",
  checklist: "checklist",
};

const typeLabels: Record<string, string> = {
  guest: "Guest",
  task: "Task",
  vendor: "Vendor",
  event: "Event",
  checklist: "Checklist",
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/checklists": "Checklists",
  "/dashboard/budget": "Budget",
  "/dashboard/guests": "Guest List",
  "/dashboard/vendors": "Vendors",
  "/dashboard/seating": "Seating",
  "/dashboard/timeline": "Timeline",
  "/dashboard/outfits": "Outfits",
  "/dashboard/tasks": "Tasks",
  "/dashboard/moodboard": "Mood Board",
  "/dashboard/export": "Export",
  "/dashboard/allergies": "Allergies & Diets",
  "/dashboard/subscription": "Subscription",
  "/dashboard/settings": "Settings",
};

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const pageTitle = pageTitles[pathname] ?? "Overview";
  const section = "Dashboard";

  const isPlanner = session?.user?.userType === "PLANNER";
  const [plannerClientName, setPlannerClientName] = useState<string | null>(null);

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
              setPlannerClientName(active.clientName);
            }
          }
        })
        .catch(() => {});
    } else {
      setPlannerClientName(null);
    }
  }, [isPlanner, session?.user?.weddingId]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setShowResults(true);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length >= 2) {
      timerRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults([]);
      setShowResults(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on navigation
  useEffect(() => {
    setShowResults(false);
    setQuery("");
  }, [pathname]);

  function handleResultClick(result: SearchResult) {
    setShowResults(false);
    setQuery("");
    router.push(result.href);
  }

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 w-full z-40 glass-header border-b border-primary-container/15">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        {/* Breadcrumb (desktop) / Logo (mobile) */}
        <div className="flex items-center gap-2">
          <a href="/dashboard" className="md:hidden flex items-center">
            <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-12 w-auto" width={400} height={400} />
          </a>
          <nav className="hidden md:flex items-center gap-2 text-sm font-label text-on-surface-variant">
            {isPlanner && plannerClientName && (
              <>
                <a href="/planner" className="hover:text-primary transition-colors">Planner</a>
                <Icon name="chevron_right" className="text-xs" />
                <span>{plannerClientName}</span>
                <Icon name="chevron_right" className="text-xs" />
              </>
            )}
            {!(isPlanner && plannerClientName) && (
              <>
                <span>{section}</span>
                <Icon name="chevron_right" className="text-xs" />
              </>
            )}
            <span className="text-primary font-semibold">{pageTitle}</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
        {/* Search (desktop) */}
        <div ref={searchRef} className="relative hidden sm:block">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xl" />
          <input
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-1 focus:ring-primary-container w-64 outline-none"
            placeholder="Search tasks, guests..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow overflow-hidden z-50">
              {searching ? (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => handleResultClick(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left cursor-pointer"
                    >
                      <Icon name={typeIcons[r.type]} className="text-primary/60 text-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{r.title}</p>
                        <p className="text-xs text-on-surface-variant truncate">{r.subtitle}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/50 font-label">
                        {typeLabels[r.type]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile / Logout */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <Icon name="person" className="text-primary text-xl" />
          </button>

          {showProfileMenu && (
            <div className="absolute top-full mt-2 right-0 w-44 bg-surface-container-lowest rounded-xl ghost-border ambient-shadow overflow-hidden z-50">
              <a
                href="/dashboard/settings"
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-label text-on-surface hover:bg-surface-container-low transition-colors"
                onClick={() => setShowProfileMenu(false)}
              >
                <Icon name="settings" className="text-lg text-on-surface-variant" />
                Settings
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-label text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Icon name="logout" className="text-lg" />
                Log Out
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}
