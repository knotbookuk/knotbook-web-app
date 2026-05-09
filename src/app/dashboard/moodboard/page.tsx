"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface MoodBoardItem {
  id: string;
  title: string;
  imageUrl: string | null;
  category: string | null;
  tags: string[];
  notes: string | null;
  isSaved: boolean;
}

type FilterCategory = "All" | string;

const gradients = [
  "bg-gradient-to-br from-rose-200 via-pink-100 to-amber-100",
  "bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100",
  "bg-gradient-to-br from-stone-100 via-neutral-50 to-amber-50",
  "bg-gradient-to-br from-orange-200 via-amber-100 to-yellow-50",
  "bg-gradient-to-br from-green-100 via-emerald-50 to-lime-50",
  "bg-gradient-to-br from-purple-200 via-violet-100 to-fuchsia-50",
  "bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-100",
  "bg-gradient-to-br from-pink-200 via-rose-100 to-red-50",
  "bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-50",
  "bg-gradient-to-br from-teal-200 via-cyan-100 to-emerald-50",
];

const heights = ["h-48", "h-56", "h-60", "h-64", "h-72"];

function getGradient(index: number): string {
  return gradients[index % gradients.length];
}

function getHeight(index: number): string {
  return heights[index % heights.length];
}

const defaultFormData = {
  title: "",
  category: "",
  tags: "",
  notes: "",
  imageUrl: "",
};

/* ─── Skeleton ─── */
function MoodBoardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-48 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-64 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-surface-container rounded-full" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-24 bg-surface-container rounded-full" />
        ))}
      </div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={`break-inside-avoid ${getHeight(i)} bg-surface-container-low rounded-3xl`} />
        ))}
      </div>
    </div>
  );
}

export default function MoodBoardPage() {
  const [items, setItems] = useState<MoodBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MoodBoardItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/moodboard");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setUrlError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: MoodBoardItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category || "",
      tags: item.tags.join(", "),
      notes: item.notes || "",
      imageUrl: item.imageUrl || "",
    });
    setUrlError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUrlError(null);

    // If the user pasted a non-Cloudinary URL, route it through our
    // server-side Cloudinary fetch so we host the image (no hot-link
    // breakage, no CORS, no 404-later) and validate it's actually an
    // image. Already-Cloudinary URLs (from the upload button or a
    // previous import) skip this round-trip.
    let finalImageUrl = formData.imageUrl?.trim() || null;
    if (finalImageUrl && !finalImageUrl.includes("res.cloudinary.com")) {
      try {
        const res = await fetch("/api/upload/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: finalImageUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUrlError(data.error || "Couldn't import that image.");
          setSaving(false);
          return;
        }
        finalImageUrl = data.url;
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      } catch {
        setUrlError("Couldn't import that image. Try a different URL or upload directly.");
        setSaving(false);
        return;
      }
    }

    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title,
      category: formData.category || null,
      tags,
      notes: formData.notes || null,
      imageUrl: finalImageUrl,
      isSaved: true,
    };

    try {
      const url = editingItem ? `/api/moodboard/${editingItem.id}` : "/api/moodboard";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchItems();
        setModalOpen(false);
        setFormData(defaultFormData);
        setEditingItem(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/moodboard/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  const toggleSave = async (item: MoodBoardItem) => {
    const newSaved = !item.isSaved;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isSaved: newSaved } : i))
    );
    try {
      const res = await fetch(`/api/moodboard/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: newSaved }),
      });
      if (!res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isSaved: item.isSaved } : i))
        );
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isSaved: item.isSaved } : i))
      );
    }
  };

  if (loading) return <MoodBoardSkeleton />;

  // Build filter pills from tags
  const allTags = [...new Set(items.flatMap((i) => i.tags))];
  const filterPills: FilterCategory[] = ["All", ...allTags];

  const filteredItems =
    activeFilter === "All"
      ? items
      : items.filter((item) => item.tags.includes(activeFilter));

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Mood Board
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-label">
            Collect and organise your wedding inspiration
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Inspiration
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map((pill) => (
          <button
            key={pill}
            onClick={() => setActiveFilter(pill)}
            className={`px-5 py-2 rounded-full text-sm font-label font-medium transition-all cursor-pointer ${
              activeFilter === pill
                ? "gold-gradient text-white shadow-md"
                : "bg-surface-container-low text-on-surface-variant hover:text-primary ghost-border"
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      {filteredItems.length > 0 ? (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="break-inside-avoid bg-surface-container-lowest rounded-3xl overflow-hidden ambient-shadow ghost-border group"
            >
              {/* Image / Placeholder — gradient is always the bottom
                  layer so a 404/broken image gracefully falls back to it. */}
              <div className={`${getHeight(index)} relative ${getGradient(index)}`}>
                {item.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                {/* Save Button */}
                <button
                  onClick={() => toggleSave(item)}
                  className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                    item.isSaved
                      ? "gold-gradient text-white"
                      : "bg-white/80 backdrop-blur-sm text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <Icon name={item.isSaved ? "favorite" : "favorite_border"} className="text-xl" />
                </button>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <h3 className="font-headline text-lg text-on-surface mb-3">
                  {item.title}
                </h3>
                {item.notes && (
                  <p className="text-xs text-on-surface-variant/70 mb-3 leading-relaxed">
                    {item.notes}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-surface-container-low text-xs font-label text-on-surface-variant ghost-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 py-1.5 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="py-1.5 px-3 rounded-xl border border-outline-variant/40 text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
                  >
                    <Icon name="delete" className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Icon name="photo_library" className="text-5xl text-primary/30 mb-4" />
          <p className="font-headline text-xl text-on-surface-variant">
            {activeFilter === "All"
              ? "No inspiration yet"
              : "No inspiration found for this category"}
          </p>
          <p className="text-sm text-on-surface-variant/60 mt-1 font-label">
            {activeFilter === "All"
              ? "Start collecting ideas for your big day!"
              : "Try a different filter or add new inspiration"}
          </p>
        </div>
      )}

      {/* ─── Add/Edit Item Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingItem ? "Edit Inspiration" : "Add New Inspiration"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Romantic Garden Arch"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Image
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <ImageUpload
                    currentUrl={formData.imageUrl || undefined}
                    onUpload={(url) => setFormData({ ...formData, imageUrl: url })}
                    label="Upload Image"
                  />
                  <span className="text-xs text-on-surface-variant/50 font-label self-center hidden sm:block">or</span>
                  <div className="flex-1 w-full">
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        if (urlError) setUrlError(null);
                      }}
                      className={`w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 transition-all ${
                        urlError
                          ? "border-error/40 focus:ring-error/20"
                          : "focus:ring-primary/20"
                      }`}
                      placeholder="https://..."
                    />
                    {urlError ? (
                      <p className="mt-1.5 text-xs text-error font-label">{urlError}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-on-surface-variant/60 font-label">
                        Upload an image or paste a URL from any website. Pasted URLs are imported and stored on our CDN so they never break.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Venue"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Venue, Floral, Decor"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={3}
                  placeholder="Any notes..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update" : "Add Inspiration"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingItem(null); }}
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
