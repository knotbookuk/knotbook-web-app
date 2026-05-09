"use client";
import Icon from "@/components/Icon";

const FEATURES = [
  {
    icon: "smart_toy",
    title: "AI-Powered Planning",
    description:
      "Let artificial intelligence take the stress out of wedding planning. Get smart suggestions for vendors based on your budget and style, automatically optimised timelines that adapt to your schedule, and intelligent budget allocation that maximises every pound. From seating arrangements to menu pairings, AI will help you make the best decisions for your big day.",
  },
  {
    icon: "flight",
    title: "Destination Wedding Planner",
    description:
      "Planning a wedding abroad? We have got you covered. Manage travel logistics for your entire guest list including hotel bookings, convoy coordination, and detailed itineraries. Track flight numbers, compare international venues, assign rooms for guests, and keep everyone informed with a shared travel hub. Everything you need for a seamless destination celebration.",
  },
  {
    icon: "language",
    title: "KnotBook Goes Global",
    description:
      "Wedding planning without borders. Automatic currency conversion lets you compare vendor quotes across countries, while our international venue directory helps you discover stunning locations worldwide. Multi-language support means every guest feels included, regardless of where they are. Your wedding, your way, anywhere in the world.",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
          Coming Soon
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant font-label">
          Exciting new features are on the way
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="bg-surface-container-lowest rounded-2xl ghost-border p-6 md:p-8 flex flex-col items-start gap-5 hover:shadow-lg transition-shadow"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center shrink-0">
              <Icon name={feature.icon} className="text-white text-2xl" />
            </div>

            {/* Title */}
            <h2 className="font-headline text-xl text-on-surface">
              {feature.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-on-surface-variant font-label leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <div className="text-center pt-4">
        <p className="text-xs text-on-surface-variant/60 font-label">
          Have a feature request?{" "}
          <a
            href="/planner/feedback"
            className="text-primary hover:underline font-medium"
          >
            Share your ideas
          </a>{" "}
          and help shape the future of KnotBook.
        </p>
      </div>
    </div>
  );
}
