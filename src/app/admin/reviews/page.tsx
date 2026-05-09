"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

interface Review {
  id: string;
  name: string;
  location: string | null;
  rating: number;
  quote: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  name: "",
  location: "",
  rating: 5,
  quote: "",
  sortOrder: 0,
  isVisible: true,
};

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            className={readonly ? "" : "cursor-pointer hover:scale-110 transition-transform"}
          >
            <Icon name="star" className={`text-base transition-colors ${
                filled ? "text-amber-500" : "text-on-surface-variant/25"
              }`} />
          </button>
        );
      })}
    </div>
  );
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [session, router]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    fetchReviews();
  }, [status, session]);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  }

  function openEdit(r: Review) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      location: r.location || "",
      rating: r.rating,
      quote: r.quote,
      sortOrder: r.sortOrder,
      isVisible: r.isVisible,
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.quote.trim()) {
      setError("Name and quote are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/reviews/${editingId}` : "/api/reviews";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      await fetchReviews();
      setShowModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // silently fail
    }
  }

  async function toggleVisible(r: Review) {
    try {
      const res = await fetch(`/api/reviews/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !r.isVisible }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
    } catch {
      // silently fail
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="max-w-[1200px] mx-auto">
          <div className="h-10 w-48 bg-surface-container rounded-xl animate-pulse" />
          <div className="mt-6 h-64 bg-surface-container-low rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Homepage Reviews</h1>
      </header>

      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-headline text-lg text-on-surface">All Reviews</h2>
              <p className="text-xs font-label text-on-surface-variant mt-0.5">
                {reviews.length} total · shown on the public homepage
              </p>
            </div>
            <button
              onClick={openAdd}
              className="gold-gradient text-white px-5 py-2.5 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Icon name="add" className="text-lg" />
              Add Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border p-10 text-center">
              <Icon name="rate_review" className="text-5xl text-primary/30 mb-3" />
              <p className="font-headline text-xl text-on-surface-variant">
                No reviews yet
              </p>
              <p className="text-sm font-label text-on-surface-variant/60 mt-1">
                The homepage will show the default testimonials until you add your own.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className={`bg-surface-container-lowest rounded-2xl ghost-border p-5 ${
                    r.isVisible ? "" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-label font-semibold text-on-surface text-sm">{r.name}</p>
                      {r.location && (
                        <p className="text-xs font-label text-on-surface-variant">{r.location}</p>
                      )}
                    </div>
                    <StarRating value={r.rating} readonly />
                  </div>
                  <p className="text-sm font-label text-on-surface-variant italic mb-4 leading-relaxed">
                    &ldquo;{r.quote}&rdquo;
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-label text-on-surface-variant/60">
                      Sort: {r.sortOrder}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleVisible(r)}
                        className="px-2.5 py-1 rounded-lg text-xs font-label text-on-surface-variant hover:bg-surface-container cursor-pointer"
                      >
                        {r.isVisible ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="px-2.5 py-1 rounded-lg text-xs font-label text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-label text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingId ? "Edit Review" : "Add Review"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Priya & Raj"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Location / Detail
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. London, 350 guests"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Rating
                </label>
                <StarRating
                  value={form.rating}
                  onChange={(v) => setForm({ ...form, rating: v })}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Quote *
                </label>
                <textarea
                  required
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
                  rows={3}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="What the couple loved about KnotBook…"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                    }
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <label className="flex items-center gap-2 mt-7 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm font-label text-on-surface-variant">
                    Show on homepage
                  </span>
                </label>
              </div>
              {error && (
                <p className="text-error text-xs font-label">{error}</p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingId ? "Update Review" : "Add Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
