"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface FeedbackItem {
  id: string;
  featureArea: string;
  rating: number;
  message: string;
  screenshotUrl: string | null;
  isRead: boolean;
  adminNotes: string | null;
  createdAt: string;
}

const FEATURE_AREAS = [
  "Dashboard",
  "Budget",
  "Checklists",
  "Guest List",
  "Vendors",
  "Seating",
  "Timeline",
  "Outfits",
  "Tasks",
  "Mood Board",
  "Catering",
  "Beauty",
  "Export",
  "Other",
];

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "text-2xl",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? "" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Icon name="star" className={`${size} transition-colors ${
              star <= (hover || value)
                ? "text-amber-500"
                : "text-on-surface-variant/25"
            }`} />
        </button>
      ))}
    </div>
  );
}

/* ─── Skeleton ─── */

function FeedbackSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-12 w-72 bg-surface-container rounded-xl" />
        <div className="mt-2 h-4 w-96 bg-surface-container rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
      <div className="h-96 bg-surface-container-low rounded-2xl" />
    </div>
  );
}

/* ─── Component ─── */

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [featureArea, setFeatureArea] = useState("");
  const [rating, setRating] = useState(0);
  const [loveMessage, setLoveMessage] = useState("");
  const [improveMessage, setImproveMessage] = useState("");

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!featureArea) return;
    if (rating === 0) return;
    if (!loveMessage.trim() && !improveMessage.trim()) return;

    setSaving(true);
    setSuccessMsg("");

    // Combine the two textareas into a single message
    const parts: string[] = [];
    if (loveMessage.trim()) parts.push(`What I love: ${loveMessage.trim()}`);
    if (improveMessage.trim()) parts.push(`What could improve: ${improveMessage.trim()}`);
    const message = parts.join("\n\n");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureArea, rating, message }),
      });
      if (res.ok) {
        setFeatureArea("");
        setRating(0);
        setLoveMessage("");
        setImproveMessage("");
        setSuccessMsg("Thank you for your feedback!");
        fetchFeedback();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FeedbackSkeleton />;

  return (
    <div
      className="space-y-8 transition-opacity duration-500 ease-out"
      style={{ opacity: loading ? 0 : 1 }}
    >
      {/* Header */}
      <div>
        <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
          Your KnotBook Experience
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant font-label">
          Share your thoughts, rate features and help shape future updates.
        </p>
      </div>

      {/* Feedback Form */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6 md:p-8">
        <h2 className="font-headline text-2xl text-on-surface mb-6">
          Share Your Feedback
        </h2>

        {successMsg && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-800 text-sm font-label">
            <Icon name="check_circle" className="text-lg" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Feature Area */}
          <div>
            <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
              Feature Area
            </label>
            <select
              value={featureArea}
              onChange={(e) => setFeatureArea(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="">Select a feature...</option>
              {FEATURE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Star Rating */}
          <div>
            <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
              Rating
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Love */}
          <div>
            <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
              What do you love about KnotBook?
            </label>
            <textarea
              value={loveMessage}
              onChange={(e) => setLoveMessage(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              rows={3}
              placeholder="Tell us what you enjoy most..."
            />
          </div>

          {/* Improve */}
          <div>
            <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
              What could be improved?
            </label>
            <textarea
              value={improveMessage}
              onChange={(e) => setImproveMessage(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              rows={3}
              placeholder="Share any suggestions or pain points..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !featureArea || rating === 0 || (!loveMessage.trim() && !improveMessage.trim())}
            className="gold-gradient text-white px-8 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Icon name="send" className="text-lg" />
            {saving ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>

      {/* Feedback History */}
      {items.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/15">
            <h2 className="font-headline text-xl text-on-surface">
              Feedback History
            </h2>
            <p className="text-xs font-label text-on-surface-variant mt-0.5">
              Your previous submissions
            </p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-container-lowest">
                <tr className="border-b border-outline-variant/15">
                  <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                      i === items.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-6 py-3.5 text-sm font-label text-on-surface-variant whitespace-nowrap">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-label font-medium text-on-surface">
                        {item.featureArea}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StarRating value={item.rating} readonly size="text-base" />
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                          item.isRead
                            ? "bg-green-100 text-green-800"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {item.isRead ? "Reviewed" : "Submitted"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <Icon name="rate_review" className="text-5xl text-primary/30 mb-4" />
          <p className="font-headline text-xl text-on-surface-variant">
            No feedback yet
          </p>
          <p className="text-sm text-on-surface-variant/60 mt-1 font-label">
            Use the form above to share your thoughts!
          </p>
        </div>
      )}
    </div>
  );
}
