"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface NavLink {
  label: string;
  /** Smooth-scrolls to an in-page section if `id` is set; otherwise navigates to `href`. */
  id?: string;
  href?: string;
  icon?: string;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
  /** Optional handler for in-page anchor navigation. Falls back to native scroll. */
  onAnchor?: (id: string) => void;
}

/**
 * Full-height right-slide drawer for the marketing/homepage hamburger menu.
 *
 * Performance characteristics:
 *  - Lazy-mounted: nothing in the DOM until `open` first becomes true.
 *  - Transform-only animation (translate3d + opacity) — GPU-composited.
 *  - Body scroll locked while open (no jank on iOS rubber-band).
 *  - Focus trapped to the drawer; ESC and backdrop tap close.
 */
export default function MobileNav({
  open,
  onClose,
  links,
  ctaLabel,
  ctaHref,
  onAnchor,
}: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll, listen for Escape, focus first item.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    // Compensate for scrollbar gutter so layout doesn't shift.
    const scrollbarGutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarGutter > 0) {
      document.body.style.paddingRight = `${scrollbarGutter}px`;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    // Focus first interactive element shortly after mount.
    const focusTimer = window.setTimeout(() => {
      firstFocusRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  // Lazy mount — never even render until first opened.
  const everOpenedRef = useRef(false);
  if (open) everOpenedRef.current = true;
  if (!everOpenedRef.current) return null;

  return (
    <div
      className={`md:hidden fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ease-out will-change-[opacity] ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={`absolute top-0 right-0 h-full w-[88%] max-w-sm bg-surface-container-lowest shadow-2xl shadow-on-surface/20 flex flex-col transform-gpu transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] will-change-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-outline-variant/10">
          <span className="font-headline italic text-2xl text-primary">KnotBook</span>
          <button
            ref={firstFocusRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="size-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed/15 transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-2xl" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {links.map((link) => {
              const handle = (e: React.MouseEvent) => {
                if (link.id) {
                  e.preventDefault();
                  onClose();
                  if (onAnchor) onAnchor(link.id);
                  else
                    document
                      .getElementById(link.id)
                      ?.scrollIntoView({ behavior: "smooth" });
                } else {
                  onClose();
                }
              };
              const className =
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-on-surface text-lg font-headline transition-colors hover:bg-primary-fixed/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
              if (link.id) {
                return (
                  <li key={link.label}>
                    <a href={`#${link.id}`} onClick={handle} className={className}>
                      {link.icon && <Icon name={link.icon} className="text-2xl text-primary/70" />}
                      {link.label}
                    </a>
                  </li>
                );
              }
              return (
                <li key={link.label}>
                  <Link href={link.href ?? "#"} onClick={handle} className={className}>
                    {link.icon && <Icon name={link.icon} className="text-2xl text-primary/70" />}
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA footer */}
        <div className="px-6 py-5 border-t border-outline-variant/10">
          <Link
            href={ctaHref}
            onClick={onClose}
            className="block w-full text-center gold-gradient text-on-primary font-semibold py-3.5 rounded-full shadow-lg shadow-primary/20"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
