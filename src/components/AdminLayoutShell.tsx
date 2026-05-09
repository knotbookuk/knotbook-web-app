"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import Icon from "@/components/Icon";

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />

      {/* Mobile hamburger button (hidden on desktop, hidden when drawer open) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="lg:hidden fixed top-3 left-4 z-40 w-10 h-10 rounded-xl bg-surface-container-lowest ghost-border ambient-shadow flex items-center justify-center cursor-pointer"
        >
          <Icon name="menu" className="text-on-surface" />
        </button>
      )}

      <main className="flex-1 min-w-0 ml-0 lg:ml-60">{children}</main>
    </div>
  );
}
