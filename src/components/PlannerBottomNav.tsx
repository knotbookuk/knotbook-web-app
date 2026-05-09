"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Icon from "@/components/Icon";

const bottomNavItems = [
  { icon: "dashboard", label: "Home", href: "/planner" },
  { icon: "group", label: "Clients", href: "/planner/clients" },
  { icon: "settings", label: "Settings", href: "/planner/settings" },
  { icon: "card_membership", label: "Subscription", href: "/planner/subscription" },
];

const menuItems = [
  { icon: "dashboard", label: "Dashboard", href: "/planner" },
  { icon: "group", label: "Clients", href: "/planner/clients" },
  { icon: "card_membership", label: "Subscription", href: "/planner/subscription" },
  { icon: "rate_review", label: "Feedback", href: "/planner/feedback" },
  { icon: "settings", label: "Settings", href: "/planner/settings" },
  { icon: "new_releases", label: "Coming Soon", href: "/planner/coming-soon" },
];

export default function PlannerBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-background flex justify-around items-center h-16 px-4 border-t border-primary-container/20 shadow-[0_-4px_20px_rgba(115,92,0,0.05)]">
        {bottomNavItems.map((item) => {
          const isActive =
            item.href === "/planner"
              ? pathname === "/planner"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative ${
                isActive
                  ? "text-primary bg-primary-fixed/20 rounded-xl px-3 py-1"
                  : "text-on-surface-variant/40"
              }`}
            >
              <Icon name={item.icon} />
              <span className="text-[10px] uppercase font-label tracking-tighter">
                {item.label}
              </span>
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

      {/* Menu Sheet */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-3xl max-h-[80vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
            </div>

            {/* Nav Links */}
            <div className="px-4 pb-4 grid grid-cols-3 gap-2">
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/planner"
                    ? pathname === "/planner"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors relative ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <Icon name={item.icon} className="text-xl" />
                    <span className="text-[11px] font-label font-medium text-center leading-tight">{item.label}</span>
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
