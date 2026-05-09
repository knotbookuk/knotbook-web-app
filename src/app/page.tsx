"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Icon from "@/components/Icon";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";

/* ────────────────────────────────────────────────────────────
   useScrollReveal – lightweight Intersection Observer hook
   Elements with data-reveal animate in when they enter the viewport.
   ──────────────────────────────────────────────────────────── */
function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Mobile = opacity-only fade, no translate, shorter — feels much smoother
    // when the user is scrolling on a weaker GPU.
    const isSmall = typeof window !== "undefined" && window.innerWidth < 768;
    const travelPx = reduceMotion || isSmall ? 0 : 12;
    const durationMs = reduceMotion ? 0 : isSmall ? 260 : 380;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = "1";
            if (travelPx > 0) el.style.transform = "translateY(0)";
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      // Trigger animations BEFORE the section crosses the fold so scrolling
      // never visibly catches up to a still-fading element.
      { threshold: 0, rootMargin: isSmall ? "0px 0px 80px 0px" : "0px 0px -80px 0px" }
    );

    const raf = requestAnimationFrame(() => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
      const viewportH = window.innerHeight;
      // PASS 1 — reads.
      const visibility = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top < viewportH && r.bottom > 0;
      });
      // PASS 2 — writes.
      els.forEach((el, i) => {
        if (visibility[i] || reduceMotion) {
          el.style.opacity = "1";
          if (travelPx > 0) el.style.transform = "translateY(0)";
          el.style.transition = "none";
        } else {
          el.style.opacity = "0";
          if (travelPx > 0) el.style.transform = `translateY(${travelPx}px)`;
          el.style.transition =
            travelPx > 0
              ? `opacity ${durationMs}ms cubic-bezier(.22,1,.36,1), transform ${durationMs}ms cubic-bezier(.22,1,.36,1)`
              : `opacity ${durationMs}ms cubic-bezier(.22,1,.36,1)`;
          observerRef.current?.observe(el);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      observerRef.current?.disconnect();
    };
  }, []);
}

/* ────────────────────────────────────────────────────────────
   Features data
   ──────────────────────────────────────────────────────────── */
const features = [
  {
    icon: "group",
    title: "Guest Management",
    desc: "Track RSVPs, dietary needs, allergies, plus-ones, and family groups across multiple events with ease.",
  },
  {
    icon: "payments",
    title: "Budget Tracking",
    desc: "Monitor spending, set category budgets, and keep every pound accounted for in real time.",
  },
  {
    icon: "event_seat",
    title: "Seating Planner",
    desc: "Drag-and-drop table arrangements that respect family dynamics and cultural traditions.",
  },
  {
    icon: "restaurant_menu",
    title: "Menu & Catering",
    desc: "Plan your full wedding menu, beverages, and dietary accommodations in one organised hub.",
  },
  {
    icon: "brush",
    title: "Beauty Planning",
    desc: "Manage MUA and hairstylist bookings, schedule trials, and save inspiration looks.",
  },
  {
    icon: "storefront",
    title: "Vendor Management",
    desc: "Save vendor contacts, contracts, and payment schedules with reminders for every milestone.",
  },
  {
    icon: "timeline",
    title: "Wedding Timeline",
    desc: "Build a day-of schedule from ceremony to last dance with smart time-block suggestions.",
  },
  {
    icon: "checkroom",
    title: "Outfit Tracker",
    desc: "Organise outfits for every ceremony, track fittings, and keep everything in one place.",
  },
  {
    icon: "palette",
    title: "Mood Board",
    desc: "Pin inspiration images, colour palettes, and ideas to shape the vision for your day.",
  },
];

/* ────────────────────────────────────────────────────────────
   Cultural traditions data
   ──────────────────────────────────────────────────────────── */
const cultures = [
  {
    id: "british",
    label: "British",
    icon: "church",
    colour: "from-[#2c5f2d] to-[#97bc62]",
    items: [
      "Ceremony & reception timeline builder",
      "Table plan with drag-and-drop seating",
      "Guest RSVP & dietary preference tracking",
      "Budget tracker with vendor payments",
      "Day-of schedule & checklist manager",
    ],
  },
  {
    id: "asian",
    label: "Asian",
    icon: "celebration",
    colour: "from-[#d4af37] to-[#735c00]",
    items: [
      "Multi-day event planner (Mehndi, Sangeet, Baraat & more)",
      "Outfit tracker across every ceremony",
      "Guest list with family side groupings",
      "Full budget & vendor management suite",
      "Customisable checklists for each event",
    ],
  },
  {
    id: "arab",
    label: "Arab",
    icon: "mosque",
    colour: "from-[#1a5276] to-[#7fb3d8]",
    items: [
      "Nikah & Walima event timeline builder",
      "Flexible seating planner for any layout",
      "Guest management with family groupings",
      "Budget tracking & vendor payments",
      "Customisable day-of checklists & schedule",
    ],
  },
];

/* ────────────────────────────────────────────────────────────
   Pricing data
   ──────────────────────────────────────────────────────────── */
const pricingPlans = [
  {
    name: "Personal",
    icon: "favorite",
    monthlyPrice: 2.99,
    yearlyPrice: 29.99,
    features: [
      "Dashboard & wedding countdown",
      "Budget tracking & reports",
      "Guest list & seating planner",
      "Vendor management",
      "Wedding day timeline",
      "Checklist & task management",
      "Outfit & mood board",
      "Menu & catering planning",
      "Export to CSV",
    ],
  },
  {
    name: "Planner Basic",
    icon: "description",
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    badge: "Popular",
    features: [
      "Everything in Personal, plus:",
      "Allergy & dietary tracking",
      "Beauty trial scheduling",
      "Inspiration gallery",
      "Advanced export options",
      "Email support",
    ],
  },
  {
    name: "Planner Advanced",
    icon: "workspace_premium",
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    features: [
      "Everything in Planner Basic, plus:",
      "Priority email support",
      "AI-powered suggestions (coming soon)",
      "Custom wedding website (coming soon)",
      "Advanced analytics & insights",
      "PDF export with branding",
      "Early access to new features",
    ],
  },
];

/* ────────────────────────────────────────────────────────────
   Testimonials (default fallback — admin can override via /admin/reviews)
   ──────────────────────────────────────────────────────────── */
interface Testimonial {
  quote: string;
  name: string;
  detail: string;
  rating?: number;
}

const defaultTestimonials: Testimonial[] = [
  {
    quote:
      "KnotBook kept our three-day wedding flawlessly organised. Every auntie knew exactly where to be!",
    name: "Priya & Raj",
    detail: "London, 350 guests",
    rating: 5,
  },
  {
    quote:
      "The cultural toggle saved us so much time. We planned both our Nikah and civil ceremony in one place.",
    name: "Aisha & Omar",
    detail: "Birmingham, 220 guests",
    rating: 5,
  },
  {
    quote:
      "Budget tracking alone was worth it. We came in under budget and had the day of our dreams.",
    name: "Sophie & James",
    detail: "Manchester, 120 guests",
    rating: 5,
  },
  {
    quote:
      "The seating planner saved hours of family back-and-forth. Drag, drop, done.",
    name: "Hassan & Layla",
    detail: "Leeds, 280 guests",
    rating: 5,
  },
  {
    quote:
      "Sharing the dashboard with my planner meant nothing slipped through the cracks.",
    name: "Mia & Daniel",
    detail: "Glasgow, 180 guests",
    rating: 5,
  },
  {
    quote:
      "Our mums could finally see the same checklist we did. Best wedding investment we made.",
    name: "Zara & Ibrahim",
    detail: "Bradford, 400 guests",
    rating: 5,
  },
];

/* ────────────────────────────────────────────────────────────
   How It Works steps
   ──────────────────────────────────────────────────────────── */
const howItWorksSteps = [
  {
    icon: "person_add",
    title: "Create Your Account",
    desc: "Sign up free and tell us about your special day.",
  },
  {
    icon: "edit_calendar",
    title: "Plan Every Detail",
    desc: "Use our tools to manage guests, budget, seating and more.",
  },
  {
    icon: "celebration",
    title: "Celebrate Together",
    desc: "Share updates with family and enjoy a stress-free celebration.",
  },
];

/* ────────────────────────────────────────────────────────────
   Why KnotBook differentiators
   ──────────────────────────────────────────────────────────── */
const whyKnotBook = [
  {
    icon: "diversity_3",
    title: "Built for Every Tradition",
    desc: "From British church weddings to multi-day Asian celebrations and Arab Nikah ceremonies, KnotBook adapts to your culture. Multi-event timelines, family-side groupings, and outfit tracking across every ceremony — no generic templates here.",
    highlight: "Tailored to your culture",
  },
  {
    icon: "family_restroom",
    title: "Plan as a Family",
    desc: "Weddings are a family affair. Assign tasks to parents, siblings, and in-laws, manage both sides of the family with ease, and keep everyone in the loop without the chaos of group chats.",
    highlight: "Everyone stays on the same page",
  },
  {
    icon: "shield",
    title: "Your Day, Your Data",
    desc: "No ads, no data selling, no third-party access. Your wedding details stay private and secure. Export everything whenever you want — your data belongs to you, always.",
    highlight: "Privacy-first approach",
  },
];

/* ════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.id;
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCulture, setActiveCulture] = useState("asian");
  const [yearlyBilling, setYearlyBilling] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTestimonials(
            data.map((r: { name: string; location: string | null; rating: number; quote: string }) => ({
              quote: r.quote,
              name: r.name,
              detail: r.location || "",
              rating: r.rating,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useScrollReveal();

  /* Sticky nav glassmorphism on scroll — rAF-throttled so the read
     never tears across paint frames or causes input-blocking layout. */
  useEffect(() => {
    let raf = 0;
    let last = false;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const next = window.scrollY > 40;
        if (next !== last) {
          last = next;
          setScrolled(next);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const currentCulture = cultures.find((c) => c.id === activeCulture)!;

  return (
    <>
      {/* ── Keyframe Animations ── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 0.7;  transform: scale(1.08); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-fade-in-up   { animation: fadeInUp 0.8s cubic-bezier(.22,1,.36,1) both; }
        .animate-float        { animation: float 5s ease-in-out infinite; }
        .animate-pulse-glow   { animation: pulse 4s ease-in-out infinite; }
        .animate-shimmer      { animation: shimmer 3s linear infinite; }
        .animate-spin-slow    { animation: spinSlow 30s linear infinite; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }

        /* Card hover lift */
        .card-lift {
          transition: transform 0.35s cubic-bezier(.22,1,.36,1), box-shadow 0.35s ease, border-color 0.35s ease;
        }
        .card-lift:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 48px -12px rgba(115,92,0,0.12);
          border-color: #d4af37;
        }

        /* Button press */
        .btn-press {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn-press:hover {
          transform: scale(1.03);
        }
        .btn-press:active {
          transform: scale(0.98);
        }

        /* Culture tab underline */
        .culture-tab {
          position: relative;
          transition: color 0.3s ease;
        }
        .culture-tab::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 2px;
          background: #d4af37;
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .culture-tab[data-active="true"]::after {
          transform: scaleX(1);
        }

        /* Gold border glow for pricing */
        .gold-border-glow {
          position: relative;
        }
        .gold-border-glow::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 1.125rem;
          background: linear-gradient(135deg, #d4af37, #735c00, #d4af37);
          z-index: -1;
        }

        /* How It Works connector line */
        .steps-connector {
          position: relative;
        }
        .steps-connector::before {
          content: '';
          position: absolute;
          top: 36px;
          left: calc(16.666% + 60px);
          right: calc(16.666% + 60px);
          height: 2px;
          border-top: 2px dashed rgba(212, 175, 55, 0.35);
          pointer-events: none;
        }
        @media (max-width: 767px) {
          .steps-connector::before {
            display: none;
          }
        }

        /* Browser window dots */
        .browser-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
           1. STICKY NAV BAR
           ══════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-header border-b border-outline-variant/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center cursor-pointer"
          >
            <Image src="/images/knotbook-logo-nav.png"
              alt="KnotBook"
              className="h-20 w-auto" width={400} height={400} priority />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", id: "features" },
              { label: "Pricing", id: "pricing" },
              { label: "About", id: "about" },
              { label: "Traditions", id: "traditions" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="btn-press gold-gradient text-on-primary font-semibold text-sm px-5 py-2.5 rounded-full shadow-lg shadow-primary/20 cursor-pointer"
            >
              {isLoggedIn ? "Dashboard" : "Get Started"}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} className="text-2xl" />
          </button>
        </div>

      </nav>

      {/* Modern off-canvas mobile menu — slides in from the right, focus-trapped, GPU-animated */}
      <MobileNav
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onAnchor={(id) => scrollTo(id)}
        links={[
          { label: "Features", id: "features", icon: "auto_awesome" },
          { label: "How It Works", id: "how-it-works", icon: "play_arrow" },
          { label: "Traditions", id: "traditions", icon: "celebration" },
          { label: "Pricing", id: "pricing", icon: "card_membership" },
          { label: "About", id: "about", icon: "info" },
        ]}
        ctaLabel={isLoggedIn ? "Dashboard" : "Get Started"}
        ctaHref={isLoggedIn ? "/dashboard" : "/login"}
      />

      {/* ══════════════════════════════════════════════════════
           2. HERO SECTION
           ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden linen-texture">
        {/* Floral scatter background overlay — desktop only, decorative only */}
        <Image src="/images/floral-scatter.png"
          alt=""
          className="hidden md:block absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.06 }} width={1024} height={1024}
          sizes="100vw" loading="lazy" />

        {/* Decorative gold blur circles — desktop only (heavy on mobile GPU) */}
        <div className="hidden md:block absolute top-20 left-[10%] w-72 h-72 bg-primary-container/20 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="hidden md:block absolute bottom-32 right-[8%] w-96 h-96 bg-primary-fixed/15 rounded-full blur-[120px] animate-pulse-glow delay-200" />
        <div className="hidden md:block absolute top-[60%] left-[55%] w-48 h-48 bg-primary-container/10 rounded-full blur-[80px] animate-pulse-glow delay-400" />

        {/* Decorative rotating ring — desktop only */}
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-outline-variant/10 rounded-full animate-spin-slow pointer-events-none" />

        {/* Floral corners — desktop only. They were the mobile LCP villain
            because Next/Image without `sizes` was fetching the w=2048 variant
            for a 256px decoration. Skipping them on phones keeps the hero
            light. */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 left-0 w-80 pointer-events-none"
          style={{ opacity: 0.3, transform: "scaleY(-1)" }} width={1024} height={1024}
          sizes="320px" loading="lazy" />
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 right-0 w-80 pointer-events-none"
          style={{ opacity: 0.3, transform: "scale(-1, -1)" }} width={1024} height={1024}
          sizes="320px" loading="lazy" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy. NO entrance animations on the hero — those caused the
              "blank for 1s then text appears in waves" flash. Below-the-fold
              sections still use data-reveal for a softer scroll-in. */}
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-4">
              The Digital Heirloom
            </p>
            <h1 className="font-headline italic text-5xl sm:text-6xl lg:text-7xl text-on-surface leading-[1.1] mb-6">
              Plan a
              <br />
              <span className="text-primary">magical wedding</span>
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-8 max-w-md">
              A premium wedding planning dashboard built for UK couples and
              professional wedding planners. Manage guests, budgets, seating,
              vendors, outfits, and every cherished tradition&mdash;all in one
              beautiful place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login?mode=signup"
                className="btn-press gold-gradient text-on-primary font-semibold px-7 py-3 rounded-full shadow-lg shadow-primary/25 text-base"
              >
                Start Free Trial
              </Link>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="btn-press ghost-border bg-surface-container-lowest/60 backdrop-blur-sm text-on-surface font-semibold px-7 py-3 rounded-full text-base hover:border-primary/40 transition-colors cursor-pointer"
              >
                See How It Works
              </button>
            </div>
            {/* Social proof mini */}
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full gold-gradient border-2 border-background flex items-center justify-center"
                  >
                    <Icon name="person" className="text-on-primary text-sm" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">50+</span>{" "}
                couples planning their perfect day
              </p>
            </div>
          </div>

          {/* Right: Wedding hero image with floral frame (desktop only) */}
          <div className="hidden lg:flex justify-center items-center relative">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-container/15 rounded-3xl blur-[40px] scale-110" />
              <div className="relative w-80 h-[26rem] xl:w-96 xl:h-[30rem] rounded-3xl overflow-hidden ambient-shadow border-2 border-primary-container/30">
                <Image src="/images/wedding-hero.jpg"
                  alt="Beautiful wedding couple"
                  className="w-full h-full object-cover" width={1200} height={800}
                  priority sizes="(max-width: 1280px) 320px, 384px" />
                {/* Gold gradient overlay at bottom for soft blend */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
              </div>
              {/* Floral corners around image — desktop only */}
              <Image src="/images/floral-corner.png"
                alt=""
                className="absolute -top-8 -left-8 w-36 pointer-events-none"
                style={{ opacity: 0.35 }} width={1024} height={1024}
                sizes="144px" loading="lazy" />
              <Image src="/images/floral-corner.png"
                alt=""
                className="absolute -bottom-8 -right-8 w-36 pointer-events-none"
                style={{ opacity: 0.35, transform: "scale(-1, -1)" }} width={1024} height={1024}
                sizes="144px" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-in-up delay-600">
          <button
            onClick={() => scrollTo("how-it-works")}
            className="flex flex-col items-center gap-1 text-on-surface-variant/50 hover:text-primary transition-colors"
          >
            <span className="text-xs tracking-widest uppercase">Explore</span>
            <Icon name="expand_more" className="text-xl animate-float" />
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           3. HOW IT WORKS
           ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section header with floral divider */}
          <div className="text-center mb-16" data-reveal>
            <Image src="/images/floral-divider.png"
              alt=""
              className="mx-auto w-48 mb-6 pointer-events-none"
              style={{ opacity: 0.35 }} width={1024} height={1024} sizes="192px" loading="lazy" />
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Simple &amp; Elegant
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-4">
              How It Works
            </h2>
            <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
              Three simple steps to plan the wedding of your dreams.
            </p>
          </div>

          {/* Steps with connector line */}
          <div className="steps-connector relative">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {howItWorksSteps.map((step, i) => (
                <div
                  key={step.title}
                  data-reveal
                  style={{ transitionDelay: `${i * 120}ms` }}
                  className="card-lift bg-surface-container-lowest rounded-2xl ghost-border p-7 text-center relative"
                >
                  {/* Number badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full gold-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-on-primary text-sm font-bold">{i + 1}</span>
                  </div>
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center mx-auto mt-3 mb-5 shadow-lg shadow-primary/15">
                    <Icon name={step.icon} className="text-on-primary text-2xl" />
                  </div>
                  <h3 className="font-headline text-xl text-on-surface mb-2">
                    {step.title}
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           4. FEATURES GRID
           ══════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 lg:py-32 bg-background relative overflow-hidden">
        {/* Floral corner — top-left */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute top-0 left-0 w-56 md:w-72 pointer-events-none"
          style={{ opacity: 0.25 }} width={1024} height={1024} sizes="(max-width: 767px) 224px, 288px" loading="lazy" />
        {/* Floral corner — top-right */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute top-0 right-0 w-56 md:w-72 pointer-events-none"
          style={{ opacity: 0.25, transform: "scaleX(-1)" }} width={1024} height={1024} sizes="(max-width: 767px) 224px, 288px" loading="lazy" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16" data-reveal>
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Everything in One Place
            </p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image src="/images/floral-accent.png"
                alt=""
                className="w-8 h-8 pointer-events-none hidden sm:block"
                style={{ opacity: 0.4, transform: "scaleX(-1)" }} width={1024} height={1024} sizes="32px" loading="lazy" />
              <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface">
                Everything You Need
              </h2>
              <Image src="/images/floral-accent.png"
                alt=""
                className="w-8 h-8 pointer-events-none hidden sm:block"
                style={{ opacity: 0.4 }} width={1024} height={1024} sizes="32px" loading="lazy" />
            </div>
            <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
              From the first guest list to the final dance, KnotBook brings
              every detail together beautifully.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
                className="card-lift bg-surface-container-lowest/80 rounded-2xl ghost-border p-7 group cursor-default text-center flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-5 shadow-lg shadow-primary/15 group-hover:shadow-primary/30 transition-shadow">
                  <Icon name={f.icon} className="text-on-primary text-[22px]" />
                </div>
                <h3 className="font-headline text-xl text-on-surface mb-2">
                  {f.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           5. WHY KNOTBOOK
           ══════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
        {/* Floral corner — bottom-left */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 left-0 w-48 md:w-64 pointer-events-none"
          style={{ opacity: 0.2, transform: "scaleY(-1)" }} width={1024} height={1024} sizes="(max-width: 767px) 192px, 256px" loading="lazy" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16" data-reveal>
            <Image src="/images/floral-divider.png"
              alt=""
              className="mx-auto w-48 mb-6 pointer-events-none"
              style={{ opacity: 0.35 }} width={1024} height={1024} sizes="192px" loading="lazy" />
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              More Than a Checklist
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-4">
              Why Couples Choose KnotBook
            </h2>
            <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
              Other tools give you spreadsheets. We give you peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyKnotBook.map((item, i) => (
              <div
                key={item.title}
                data-reveal
                style={{ transitionDelay: `${i * 120}ms` }}
                className="bg-surface-container-lowest rounded-3xl ghost-border p-8 md:p-10 flex flex-col items-center text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                  <Icon name={item.icon} className="text-on-primary text-3xl" />
                </div>
                <h3 className="font-headline text-2xl text-on-surface mb-3">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6 flex-1">
                  {item.desc}
                </p>
                <span className="px-4 py-1.5 rounded-full bg-primary-container/20 text-primary text-xs font-label font-semibold tracking-wide uppercase">
                  {item.highlight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           6. CULTURAL TOGGLE SHOWCASE
           ══════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden" id="traditions">
        {/* Floral corner — bottom-right */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 right-0 w-56 md:w-72 pointer-events-none"
          style={{ opacity: 0.25, transform: "scale(-1, -1)" }} width={1024} height={1024} sizes="(max-width: 767px) 224px, 288px" loading="lazy" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16" data-reveal>
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Honouring Every Heritage
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-4">
              Built For Every Tradition
            </h2>
            <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
              Switch between cultural styles and get ceremony-specific tools,
              checklists, and timeline templates.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-6 sm:gap-10 mb-12" data-reveal>
            {cultures.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCulture(c.id)}
                data-active={activeCulture === c.id}
                className={`culture-tab flex items-center gap-2 pb-2 text-base font-medium transition-colors cursor-pointer ${
                  activeCulture === c.id
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name={c.icon} className="text-xl" />
                {c.label}
              </button>
            ))}
          </div>

          {/* Active culture card */}
          <div className="max-w-2xl mx-auto" data-reveal>
            <div
              key={currentCulture.id}
              className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 sm:p-10"
            >
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-sm font-medium bg-gradient-to-r ${currentCulture.colour} mb-6`}
              >
                <Icon name={currentCulture.icon} className="text-lg" />
                {currentCulture.label} Wedding Tools
              </div>
              <ul className="space-y-3">
                {currentCulture.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Icon name="check_circle" className="text-primary mt-0.5 text-lg" />
                    <span className="text-on-surface">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           7. PRICING SECTION
           ══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 lg:py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-reveal>
            <Image src="/images/floral-divider.png"
              alt=""
              className="mx-auto w-48 mb-6 pointer-events-none"
              style={{ opacity: 0.35 }} width={1024} height={1024} sizes="192px" loading="lazy" />
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Simple, Transparent Pricing
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-4">
              Choose Your Plan
            </h2>
            <p className="text-on-surface-variant max-w-lg mx-auto text-lg">
              No hidden fees. Cancel anytime. Upgrade or downgrade as you need.
            </p>

            {/* Monthly / Yearly toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span
                className={`text-sm font-medium transition-colors ${!yearlyBilling ? "text-on-surface" : "text-on-surface-variant"}`}
              >
                Monthly
              </span>
              <button
                onClick={() => setYearlyBilling(!yearlyBilling)}
                className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${yearlyBilling ? "bg-primary" : "bg-outline-variant/40"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${yearlyBilling ? "translate-x-7" : "translate-x-0"}`}
                />
              </button>
              <span
                className={`text-sm font-medium transition-colors ${yearlyBilling ? "text-on-surface" : "text-on-surface-variant"}`}
              >
                Yearly
              </span>
              {yearlyBilling && (
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                  Save up to 17%
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-4 overflow-visible">
            {pricingPlans.map((plan, idx) => {
              const isHighlighted = !!plan.badge;
              return (
                <div
                  key={plan.name}
                  data-reveal
                  style={{ transitionDelay: `${idx * 100}ms` }}
                  className={`card-lift relative rounded-2xl p-8 flex flex-col ${
                    isHighlighted
                      ? "gold-gradient pt-10"
                      : "bg-surface-container-lowest ghost-border"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <span className="bg-white text-primary text-xs font-bold px-5 py-2 rounded-full shadow-lg whitespace-nowrap">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Icon + Name */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <Icon name={plan.icon} className={`text-2xl ${isHighlighted ? "text-white" : "text-primary"}`} />
                    <h3
                      className={`font-headline text-2xl ${isHighlighted ? "text-white" : "text-on-surface"}`}
                    >
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-6 mt-4">
                    <span
                      className={`font-headline text-5xl ${isHighlighted ? "text-white" : "text-on-surface"}`}
                    >
                      £{yearlyBilling ? plan.yearlyPrice.toFixed(2) : plan.monthlyPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-sm ${isHighlighted ? "text-white/80" : "text-on-surface-variant"}`}
                    >
                      /{yearlyBilling ? "year" : "month"}
                    </span>
                    {yearlyBilling && (
                      <p
                        className={`text-xs mt-1 ${isHighlighted ? "text-white/70" : "text-on-surface-variant"}`}
                      >
                        £{(plan.yearlyPrice / 12).toFixed(2)}/month
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Icon name="check_circle" className={`text-lg mt-0.5 ${isHighlighted ? "text-white" : "text-primary"}`} />
                        <span
                          className={`text-sm ${isHighlighted ? "text-white/90" : "text-on-surface-variant"}`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/login?mode=signup"
                    className={`btn-press block text-center font-semibold px-6 py-3 rounded-full transition-all cursor-pointer ${
                      isHighlighted
                        ? "bg-white text-primary shadow-lg hover:shadow-xl"
                        : "ghost-border bg-surface-container-lowest text-on-surface hover:border-primary/40"
                    }`}
                  >
                    Start Free Trial
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           8. TESTIMONIALS
           ══════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16" data-reveal>
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Love Stories
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface mb-4">
              Trusted by 50+ Couples
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                data-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
                className="card-lift bg-surface-container-lowest rounded-2xl ghost-border p-7 relative"
              >
                {/* Floral accent next to quote */}
                <Image src="/images/floral-accent.png"
                  alt=""
                  className="absolute top-4 right-4 w-8 h-8 pointer-events-none"
                  style={{ opacity: 0.3 }} width={1024} height={1024} sizes="32px" loading="lazy" />
                <p className="text-on-surface leading-relaxed mb-6 italic font-headline">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-on-surface text-sm">
                    {t.name}
                  </p>
                  <p className="text-on-surface-variant text-xs">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           9. ABOUT KNOTBOOK
           ══════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
        {/* Floral corner decorations */}
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute top-0 left-0 w-48 md:w-64 pointer-events-none"
          style={{ opacity: 0.2 }} width={1024} height={1024} sizes="(max-width: 767px) 192px, 256px" loading="lazy" />
        <Image src="/images/floral-corner.png"
          alt=""
          className="absolute bottom-0 right-0 w-48 md:w-64 pointer-events-none"
          style={{ opacity: 0.2, transform: "scale(-1, -1)" }} width={1024} height={1024} sizes="(max-width: 767px) 192px, 256px" loading="lazy" />

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12" data-reveal>
            <Image src="/images/floral-divider.png"
              alt=""
              className="mx-auto w-48 mb-6 pointer-events-none"
              style={{ opacity: 0.35 }} width={1024} height={1024} sizes="192px" loading="lazy" />
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Our Story
            </p>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-surface">
              About KnotBook
            </h2>
          </div>

          <div className="space-y-6 text-on-surface-variant text-base leading-relaxed" data-reveal>
            <p>
              When Joe and I got married, we didn&rsquo;t have months to plan or a beautiful binder
              full of ideas. We had under a month, just enough time to make decisions, not
              enough time to enjoy them. It was rushed, chaotic, and nothing like the calm,
              thoughtful experience we always imagined couples deserved.
            </p>
            <p>
              That moment stayed with us. Not because it was imperfect, but because it
              showed us how much pressure people face when planning something that&rsquo;s
              meant to be joyful. We realised how many couples and planners are juggling
              spreadsheets, messages, deadlines, cultural traditions, and expectations, often
              without a tool that truly understands them.
            </p>
            <p className="font-semibold text-on-surface">
              KnotBook was born from that gap.
            </p>
            <p>
              Today, KnotBook is built for every couple and every tradition, British, Asian,
              Arab, and beyond. It&rsquo;s designed to bring order to the chaos, beauty to the process,
              and calm to the moments that matter. Whether you&rsquo;re planning a multi-day
              celebration or a simple ceremony, we want you to feel supported, understood,
              and in control.
            </p>
            <p>
              We didn&rsquo;t get the wedding we dreamed of. But through KnotBook, we get to help
              others create theirs, with intention, joy, and the space to truly enjoy the journey.
            </p>
            <p className="text-on-surface font-headline italic text-lg mt-8">
              Hope we can make this journey a magical one for you
            </p>
            <p className="font-headline italic text-primary text-xl mt-2">
              Maida &amp; Joe
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           10. CTA BANNER
           ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="gold-gradient py-20 lg:py-24 relative">
          {/* Floral scatter overlay */}
          <Image src="/images/floral-scatter.png"
            alt=""
            className="hidden md:block absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.08 }} width={1024} height={1024} sizes="100vw" loading="lazy" />

          {/* Floral corner — left */}
          <Image src="/images/floral-corner.png"
            alt=""
            className="absolute top-0 left-0 w-48 md:w-64 pointer-events-none"
            style={{ opacity: 0.25 }} width={1024} height={1024} sizes="(max-width: 767px) 192px, 256px" loading="lazy" />
          {/* Floral corner — right */}
          <Image src="/images/floral-corner.png"
            alt=""
            className="absolute bottom-0 right-0 w-48 md:w-64 pointer-events-none"
            style={{ opacity: 0.25, transform: "scale(-1, -1)" }} width={1024} height={1024} sizes="(max-width: 767px) 192px, 256px" loading="lazy" />

          {/* Decorative circles */}
          <div className="absolute top-0 left-[15%] w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-white/5 rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-3xl mx-auto px-6 text-center" data-reveal>
            <h2 className="font-headline italic text-4xl sm:text-5xl text-on-primary mb-4">
              Start Your Journey Today
            </h2>
            <p className="text-on-primary/80 text-lg mb-8 max-w-lg mx-auto">
              Every love story deserves a masterpiece to hold it. Begin
              planning the celebration your family will treasure forever.
            </p>
            <Link
              href="/login?mode=signup"
              className="btn-press inline-block bg-white text-primary font-semibold px-8 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-shadow text-base"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
           10. FOOTER
           ══════════════════════════════════════════════════════ */}
      <footer className="bg-surface-container border-t border-outline-variant/30 relative">
        {/* Floral divider above footer content */}
        <div className="flex justify-center pt-8">
          <Image src="/images/floral-divider.png"
            alt=""
            className="w-48 pointer-events-none"
            style={{ opacity: 0.3 }} width={1024} height={1024} sizes="192px" loading="lazy" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Top section */}
          <div className="flex flex-col items-center text-center mb-10">
            <Link href="/" className="cursor-pointer mb-6">
              <Image src="/images/knotbook-logo-full.png"
                alt="KnotBook"
                className="h-24 w-auto" width={600} height={600} />
            </Link>
            <p className="text-on-surface-variant text-base font-headline italic max-w-md">
              Every story deserves a masterpiece to hold it.
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
            {[
              { label: "Features", action: () => scrollTo("features") },
              { label: "Pricing", action: () => scrollTo("pricing") },
              { label: "About", action: () => scrollTo("about") },
              { label: "Traditions", action: () => scrollTo("traditions") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/login"
              className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Get Started
            </Link>
          </div>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-5 mb-10">
            <a
              href="https://www.instagram.com/officialknotbook?igsh=MzF6YzR2YzhjMnEz&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a
              href="https://tiktok.com/@officialknotbook"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-surface-container-high/60 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed/20 transition-colors"
              aria-label="TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.17v-3.44a4.85 4.85 0 01-1.99-.43l-.01-.01v-.03z"/></svg>
            </a>
          </div>

          {/* Divider + Copyright */}
          <div className="border-t border-outline-variant/30 pt-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-5 text-xs font-label">
              <Link
                href="/terms"
                className="text-on-surface-variant/70 hover:text-primary transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              <span className="text-on-surface-variant/30">&middot;</span>
              <Link
                href="/privacy"
                className="text-on-surface-variant/70 hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
            </div>
            <p className="text-on-surface-variant/60 text-sm">
              &copy; {new Date().getFullYear()} KnotBook. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
