"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface GuestDietary {
  id: string;
  name: string;
  dietaryType: string | null;
  allergies: string | null;
  allergySeverity: string | null;
  dietaryNotes: string | null;
  mealPreference: string | null;
}

const dietTypeColors: Record<string, string> = {
  Vegetarian: "bg-green-100 text-green-800",
  Vegan: "bg-emerald-100 text-emerald-800",
  "Gluten-Free": "bg-amber-100 text-amber-800",
  "Nut Allergy": "bg-red-100 text-red-800",
  Halal: "bg-blue-100 text-blue-800",
  Kosher: "bg-indigo-100 text-indigo-800",
  "Dairy-Free": "bg-purple-100 text-purple-800",
  Pescatarian: "bg-cyan-100 text-cyan-800",
};

const severityColors: Record<string, string> = {
  LOW: "text-green-700",
  MEDIUM: "text-amber-700",
  HIGH: "text-red-700",
};

const severityDots: Record<string, string> = {
  LOW: "bg-green-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-red-500",
};

const severityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

/* ─── Skeleton ─── */
function AllergiesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-64 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-72 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-surface-container rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
      <div className="h-14 bg-surface-container-low rounded-2xl" />
      <div className="h-96 bg-surface-container-low rounded-3xl" />
    </div>
  );
}

export default function AllergiesPage() {
  const [guests, setGuests] = useState<GuestDietary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const start = Date.now();
    fetch("/api/guests")
      .then((res) => res.json())
      .then(async (data) => {
        if (Array.isArray(data)) {
          // Filter to only guests with dietary info
          const withDietary = data.filter(
            (g: GuestDietary) =>
              g.dietaryType || g.allergies || g.dietaryNotes || g.mealPreference
          );
          setGuests(withDietary);
        }
        const elapsed = Date.now() - start;
        if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
        setLoading(false);
      })
      .catch(async () => {
        const elapsed = Date.now() - start;
        if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
        setLoading(false);
      });
  }, []);

  if (loading) return <AllergiesSkeleton />;

  const filteredGuests = guests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (guest.dietaryType && guest.dietaryType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (guest.allergies && guest.allergies.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute stats from real data
  const dietTypeCounts: Record<string, number> = {};
  guests.forEach((g) => {
    if (g.dietaryType) {
      const types = g.dietaryType.split(",").map((t) => t.trim());
      types.forEach((t) => {
        dietTypeCounts[t] = (dietTypeCounts[t] || 0) + 1;
      });
    }
  });

  const totalFlags = Object.values(dietTypeCounts).reduce((a, b) => a + b, 0);
  const allergyCount = guests.filter((g) => g.allergies).length;

  const stats = [
    { label: "Total Guests", value: guests.length, icon: "group" },
    { label: "Total Flags", value: totalFlags, icon: "flag" },
    { label: "With Allergies", value: allergyCount, icon: "warning" },
    ...Object.entries(dietTypeCounts)
      .slice(0, 3)
      .map(([type, count]) => ({
        label: type,
        value: count,
        icon: type === "Vegetarian" ? "eco" : type === "Vegan" ? "spa" : "grain",
      })),
  ];

  const getDietBadges = (dietaryType: string | null): string[] => {
    if (!dietaryType) return [];
    return dietaryType.split(",").map((t) => t.trim()).filter(Boolean);
  };

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Dietary Requirements
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-label">
            Track guest allergies, dietary needs, and special requests
          </p>
        </div>
        <Link
          href="/dashboard/guests"
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="edit" className="text-lg" />
          Edit in Guest List
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center"
          >
            <Icon name={stat.icon} className="text-primary/40 text-xl" />
            <p className="font-headline text-2xl text-on-surface mt-1">
              {stat.value}
            </p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5 font-label">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
        <input
          type="text"
          placeholder="Search guests, diets, or allergies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface-container-lowest ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-surface-container-lowest rounded-3xl ambient-shadow ghost-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="text-left text-xs uppercase tracking-widest text-on-surface-variant/60 font-label font-semibold px-6 py-4">
                  Guest Name
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-on-surface-variant/60 font-label font-semibold px-6 py-4">
                  Diet Type
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-on-surface-variant/60 font-label font-semibold px-6 py-4">
                  Allergies
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-on-surface-variant/60 font-label font-semibold px-6 py-4">
                  Notes
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-on-surface-variant/60 font-label font-semibold px-6 py-4">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-outline-variant/15 last:border-b-0 hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href="/dashboard/guests"
                      className="text-sm font-medium text-on-surface hover:text-primary transition-colors cursor-pointer"
                    >
                      {guest.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {getDietBadges(guest.dietaryType).map((diet) => (
                        <span
                          key={diet}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-label font-medium ${
                            dietTypeColors[diet] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {diet}
                        </span>
                      ))}
                      {!guest.dietaryType && (
                        <span className="text-xs text-on-surface-variant/40">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {guest.allergies || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[220px]">
                    <span className="line-clamp-2">{guest.dietaryNotes || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    {guest.allergySeverity ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            severityDots[guest.allergySeverity] || "bg-gray-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-label font-medium ${
                            severityColors[guest.allergySeverity] || "text-gray-600"
                          }`}
                        >
                          {severityLabels[guest.allergySeverity] || guest.allergySeverity}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-on-surface-variant/40">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredGuests.map((guest) => (
          <div
            key={guest.id}
            className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border"
          >
            <div className="flex items-start justify-between mb-3">
              <Link
                href="/dashboard/guests"
                className="text-sm font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                {guest.name}
              </Link>
              {guest.allergySeverity && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      severityDots[guest.allergySeverity] || "bg-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-label font-medium ${
                      severityColors[guest.allergySeverity] || "text-gray-600"
                    }`}
                  >
                    {severityLabels[guest.allergySeverity] || guest.allergySeverity}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {getDietBadges(guest.dietaryType).map((diet) => (
                <span
                  key={diet}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-label font-medium ${
                    dietTypeColors[diet] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {diet}
                </span>
              ))}
            </div>

            {guest.allergies && (
              <p className="text-xs text-on-surface-variant mb-1">
                <span className="font-semibold">Allergies:</span>{" "}
                {guest.allergies}
              </p>
            )}
            {guest.dietaryNotes && (
              <p className="text-xs text-on-surface-variant">
                <span className="font-semibold">Notes:</span> {guest.dietaryNotes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredGuests.length === 0 && (
        <div className="text-center py-16">
          <Icon name={searchQuery ? "search_off" : "eco"} className="text-5xl text-primary/30 mb-4" />
          <p className="font-headline text-xl text-on-surface-variant">
            {searchQuery ? "No matching guests found" : "No dietary requirements recorded"}
          </p>
          <p className="text-sm text-on-surface-variant/60 mt-1 font-label">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Add dietary info via the guest list page"}
          </p>
        </div>
      )}
    </div>
  );
}
