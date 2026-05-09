"use client";

import { useState, useEffect, use, FormEvent } from "react";
import Icon from "@/components/Icon";
import Image from "next/image";

interface RsvpData {
  guestName: string;
  rsvpStatus: string;
  dietaryType: string | null;
  allergies: string | null;
  mealPreference: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  notes: string | null;
  wedding: {
    coupleName: string;
    weddingDate: string | null;
    venue: string | null;
    culturalStyle: string;
  };
}

export default function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<RsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [rsvpStatus, setRsvpStatus] = useState("ATTENDING");
  const [dietaryType, setDietaryType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [mealPreference, setMealPreference] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchRsvp() {
      try {
        const res = await fetch(`/api/rsvp/${token}`);
        if (!res.ok) {
          setError(res.status === 404 ? "This RSVP link is not valid." : "Something went wrong.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
        setRsvpStatus(json.rsvpStatus === "NO_RESPONSE" ? "ATTENDING" : json.rsvpStatus);
        setDietaryType(json.dietaryType || "");
        setAllergies(json.allergies || "");
        setMealPreference(json.mealPreference || "");
        setPlusOneName(json.plusOneName || "");
        setNotes(json.notes || "");
      } catch {
        setError("Failed to load RSVP details.");
      } finally {
        setLoading(false);
      }
    }
    fetchRsvp();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus, dietaryType, allergies, mealPreference, plusOneName, notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to submit RSVP");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const weddingDate = data?.wedding.weddingDate
    ? new Date(data.wedding.weddingDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-20 w-auto mx-auto mb-6" width={400} height={400} />
          <Icon name="link_off" className="text-error text-5xl mb-3 block" />
          <h1 className="font-headline text-2xl text-on-surface mb-2">Invalid RSVP Link</h1>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen linen-texture relative overflow-hidden">
      {/* Floral decorations */}
      <Image src="/images/floral-corner.png" alt="" className="absolute top-0 left-0 w-40 opacity-20 pointer-events-none" width={1024} height={1024} />
      <Image src="/images/floral-corner.png" alt="" className="absolute top-0 right-0 w-40 opacity-20 pointer-events-none" style={{ transform: "scaleX(-1)" }} width={1024} height={1024} />

      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Image src="/images/knotbook-logo-nav.png" alt="KnotBook" className="h-16 w-auto mx-auto mb-4" width={400} height={400} />
          <Image src="/images/floral-divider.png" alt="" className="w-64 mx-auto opacity-50 mb-6" width={1024} height={1024} />
          <p className="text-[10px] uppercase tracking-[0.3em] font-label text-on-surface-variant mb-2">You&apos;re Invited</p>
          <h1 className="font-headline text-3xl text-on-surface">{data.wedding.coupleName}</h1>
          {weddingDate && <p className="font-headline italic text-primary mt-2 text-lg">{weddingDate}</p>}
          {data.wedding.venue && <p className="text-on-surface-variant text-sm mt-1">{data.wedding.venue}</p>}
        </div>

        {submitted ? (
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 text-center animate-fade-in-up">
            <Icon name="celebration" className="text-green-600 text-5xl mb-4 block" />
            <h2 className="font-headline text-2xl text-on-surface mb-2">
              {rsvpStatus === "ATTENDING" ? "See You There!" : "Response Recorded"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {rsvpStatus === "ATTENDING"
                ? `Thank you, ${data.guestName}! We can't wait to celebrate with you.`
                : `Thank you for letting us know, ${data.guestName}. We'll miss you!`}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 animate-fade-in-up">
            <h2 className="font-headline text-xl text-on-surface text-center mb-1">
              Dear {data.guestName}
            </h2>
            <p className="text-on-surface-variant text-sm text-center mb-8">
              Please let us know if you can attend
            </p>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm text-center">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* RSVP Status */}
              <div className="flex gap-3">
                {[
                  { value: "ATTENDING", label: "Joyfully Accept", icon: "favorite" },
                  { value: "NOT_COMING", label: "Regretfully Decline", icon: "heart_broken" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRsvpStatus(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      rsvpStatus === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant/30 hover:border-outline-variant/60"
                    }`}
                  >
                    <Icon name={opt.icon} className={`text-2xl ${rsvpStatus === opt.value ? "text-primary" : "text-on-surface-variant"}`} />
                    <span className={`text-sm font-label font-medium ${rsvpStatus === opt.value ? "text-primary" : "text-on-surface-variant"}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {rsvpStatus === "ATTENDING" && (
                <>
                  {/* Dietary */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Dietary Requirements</label>
                    <select
                      value={dietaryType}
                      onChange={(e) => setDietaryType(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="">No specific requirements</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Halal">Halal</option>
                      <option value="Kosher">Kosher</option>
                      <option value="Gluten-Free">Gluten-Free</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Allergies</label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Nuts, shellfish, dairy"
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Meal Preference */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Meal Preference</label>
                    <input
                      type="text"
                      value={mealPreference}
                      onChange={(e) => setMealPreference(e.target.value)}
                      placeholder="e.g. Chicken, fish, lamb"
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Plus One */}
                  {data.plusOne && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Plus One Name</label>
                      <input
                        type="text"
                        value={plusOneName}
                        onChange={(e) => setPlusOneName(e.target.value)}
                        placeholder="Name of your guest"
                        className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Message to the Couple (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special requests or a note for the couple"
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full gold-gradient text-on-primary font-label text-sm uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Icon name="progress_activity" className="text-lg animate-spin" />}
                {submitting ? "Submitting..." : "Submit RSVP"}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <Image src="/images/floral-accent.png" alt="" className="w-12 mx-auto opacity-40 mb-3" width={1024} height={1024} />
          <p className="font-headline italic text-on-surface-variant/60 text-xs">Powered by KnotBook</p>
        </div>
      </div>
    </div>
  );
}
