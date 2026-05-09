"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Icon from "@/components/Icon";
import Image from "next/image";

const navItems = [
  { icon: "dashboard", label: "Dashboard", href: "/admin" },
  { icon: "group", label: "Users", href: "/admin/users" },
  { icon: "card_membership", label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: "feedback", label: "Feedback", href: "/admin/feedback" },
  { icon: "rate_review", label: "Reviews", href: "/admin/reviews" },
  { icon: "mail", label: "Emails", href: "/admin/emails" },
  { icon: "payments", label: "Stripe", href: "/admin/stripe" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const adminName = session?.user?.name ?? "Admin";
  const adminInitials = adminName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Lock body scroll while drawer is open and listen for Escape to close.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const handleNavClick = () => {
    onClose?.();
  };

  const navContent = (
    <>
      {/* Header */}
      <div className="px-5 py-5 border-b border-outline-variant/20">
        <Link href="/admin" onClick={handleNavClick}>
          <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-8 w-auto" width={400} height={400} />
        </Link>
        <p className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest mt-1">
          Admin
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-label transition-all cursor-pointer ${
                isActive
                  ? "text-primary font-bold bg-primary-fixed/20"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Icon name={item.icon} className="text-xl" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-outline-variant/20 space-y-3">
        {/* Admin user info */}
        <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-outline-variant/10">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-label font-semibold text-primary">
              {adminInitials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-label font-medium text-on-surface leading-tight truncate">
              {adminName}
            </p>
            <p className="text-[10px] font-label text-on-surface-variant">
              Admin
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors font-label cursor-pointer"
        >
          <Icon name="arrow_back" className="text-base" />
          Back to Site
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 text-xs text-red-600 hover:text-red-700 transition-colors font-label cursor-pointer"
        >
          <Icon name="logout" className="text-base" />
          Log Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 hidden lg:flex flex-col bg-surface-container-lowest border-r border-outline-variant/20 z-50">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/20 z-50 flex flex-col transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
      >
        {navContent}
      </aside>
    </>
  );
}
