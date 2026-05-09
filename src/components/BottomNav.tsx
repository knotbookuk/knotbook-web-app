"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { FREE_PATHS } from "@/lib/plans";
import Icon from "@/components/Icon";

const bottomNavItems = [
  { icon: "home", label: "Home", href: "/dashboard" },
  { icon: "group", label: "Guests", href: "/dashboard/guests" },
  { icon: "assignment", label: "Tasks", href: "/dashboard/tasks" },
  { icon: "timeline", label: "Timeline", href: "/dashboard/timeline" },
];

const menuItems = [
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

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const everOpenedRef = useRef(false);
  if (menuOpen) everOpenedRef.current = true;

  const isFreeUser = !session?.user?.plan;

  // Body scroll lock + ESC close while sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background flex justify-around items-center h-16 px-4 border-t border-primary-container/20 shadow-[0_-4px_20px_rgba(115,92,0,0.05)]">
        {bottomNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const isLocked = isFreeUser && !FREE_PATHS.has(item.href);

          return (
            <Link
              key={item.href}
              href={isLocked ? "/dashboard/subscription" : item.href}
              className={`flex flex-col items-center justify-center relative ${
                isLocked
                  ? "text-on-surface-variant/25"
                  : isActive
                    ? "text-primary bg-primary-fixed/20 rounded-xl px-3 py-1"
                    : "text-on-surface-variant/40"
              }`}
            >
              <Icon name={item.icon} />
              <span className="text-[10px] uppercase font-label tracking-tighter">
                {item.label}
              </span>
              {isLocked && (
                <Icon name="lock" className="text-[8px] absolute -top-0.5 -right-0.5 text-on-surface-variant/40" />
              )}
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(true)}
          className={`flex flex-col items-center justify-center cursor-pointer ${
            menuOpen ? "text-primary" : "text-on-surface-variant/40"
          }`}
        >
          <Icon name="menu" />
          <span className="text-[10px] uppercase font-label tracking-tighter">Menu</span>
        </button>
      </nav>

      {/* Menu Sheet — lazy-mounted, GPU-animated, scroll-locked */}
      {everOpenedRef.current && (
        <div
          className={`md:hidden fixed inset-0 z-[60] ${menuOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!menuOpen}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            className={`absolute inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ease-out will-change-[opacity] ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className={`absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl shadow-on-surface/20 transform-gpu transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform ${
              menuOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
            </div>

            {/* Nav Links */}
            <div className="px-4 pb-4 grid grid-cols-3 gap-2">
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                const isLocked = isFreeUser && !FREE_PATHS.has(item.href);

                return (
                  <Link
                    key={item.href + item.label}
                    href={isLocked ? "/dashboard/subscription" : item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors relative ${
                      isLocked
                        ? "text-on-surface-variant/30"
                        : isActive
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <Icon name={item.icon} className="text-xl" />
                    <span className="text-[11px] font-label font-medium text-center leading-tight">{item.label}</span>
                    {isLocked && (
                      <Icon name="lock" className="text-[10px] absolute top-1.5 right-1.5 text-on-surface-variant/40" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="px-4 pb-6 pt-2 border-t border-outline-variant/20">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-label font-medium cursor-pointer"
              >
                <Icon name="logout" className="text-lg" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
