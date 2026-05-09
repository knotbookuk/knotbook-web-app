import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your KnotBook wedding planning dashboard. Manage guests, events, budgets, vendors, outfits, and seating all in one place.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="linen-texture min-h-screen">
      <Sidebar />
      <main className="md:ml-64 min-h-screen relative pb-20 md:pb-0 overflow-hidden">
        <TopHeader />

        {/* ── Shared floral decorations across all dashboard pages ── */}
        <Image src="/images/floral-scatter.png"
          alt=""
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none select-none z-0"
          style={{ opacity: 0.035 }} width={1024} height={1024} />
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute top-0 right-0 w-32 md:w-48 pointer-events-none select-none z-0 hidden md:block"
          style={{ opacity: 0.2, transform: "scaleX(-1)" }} width={1024} height={1024} />
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 left-0 w-32 md:w-48 pointer-events-none select-none z-0 hidden md:block"
          style={{ opacity: 0.15, transform: "scaleY(-1)" }} width={1024} height={1024} />

        <div className="max-w-[1200px] mx-auto px-6 py-8 relative z-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
