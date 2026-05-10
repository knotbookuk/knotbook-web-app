"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber, parseNumber } from "@/lib/format";
import Icon from "@/components/Icon";

/* ─── Types ─── */

type ItemStatus =
  | "NOT_ORDERED"
  | "NOT_PAID"
  | "ORDERED"
  | "RECEIVED"
  | "ALTERED"
  | "READY";
type ItemType = "OUTFIT" | "JEWELLERY" | "ACCESSORY";

interface OutfitEvent {
  id: string;
  name: string;
  date: string;
}

interface OutfitItem {
  id: string;
  name: string;
  type: ItemType;
  eventId: string | null;
  event: OutfitEvent | null;
  cost: number | null;
  status: ItemStatus;
  notes: string | null;
  link: string | null;
}

const statusLabels: Record<ItemStatus, string> = {
  NOT_ORDERED: "Not yet ordered",
  NOT_PAID: "Not paid",
  ORDERED: "Ordered",
  RECEIVED: "Received",
  ALTERED: "Altered",
  READY: "Ready",
};

const statusStyles: Record<ItemStatus, string> = {
  NOT_ORDERED: "bg-surface-container text-on-surface-variant",
  NOT_PAID: "bg-amber-100 text-amber-800",
  ORDERED: "bg-tertiary-container/30 text-on-tertiary-container",
  RECEIVED: "bg-primary-container/20 text-primary",
  ALTERED: "bg-secondary-container/40 text-on-secondary-container",
  READY: "bg-secondary-container/50 text-secondary",
};

const statusIcons: Record<ItemStatus, string> = {
  NOT_ORDERED: "schedule",
  NOT_PAID: "payments",
  ORDERED: "local_shipping",
  RECEIVED: "inventory_2",
  ALTERED: "content_cut",
  READY: "check_circle",
};

const typeLabels: Record<ItemType, string> = {
  OUTFIT: "Outfit",
  JEWELLERY: "Jewellery",
  ACCESSORY: "Accessory",
};

const typeStyles: Record<ItemType, { bg: string; text: string }> = {
  OUTFIT: { bg: "bg-primary-container/15", text: "text-primary" },
  JEWELLERY: { bg: "bg-tertiary-container/20", text: "text-tertiary" },
  ACCESSORY: { bg: "bg-secondary-container/20", text: "text-secondary" },
};

const typeIcons: Record<ItemType, string> = {
  OUTFIT: "checkroom",
  JEWELLERY: "diamond",
  ACCESSORY: "watch",
};

const defaultFormData = {
  name: "",
  type: "OUTFIT" as ItemType,
  eventId: "",
  cost: "",
  status: "NOT_ORDERED" as ItemStatus,
  notes: "",
  link: "",
};

/* ─── Skeleton ─── */
function OutfitsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-64 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-40 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-32 bg-surface-container rounded-full" />
      </div>
      <div className="h-12 bg-surface-container rounded-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 bg-surface-container-low rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function OutfitsPage() {
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [events, setEvents] = useState<OutfitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OutfitItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    const start = Date.now();
    Promise.all([
      fetch("/api/outfits").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ])
      .then(async ([outfitData, eventData]) => {
        if (Array.isArray(outfitData)) setItems(outfitData);
        if (Array.isArray(eventData)) setEvents(eventData);
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

  const fetchItems = () => {
    fetch("/api/outfits")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {});
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setLinkError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: OutfitItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      eventId: item.eventId || "",
      cost: item.cost?.toString() || "",
      status: item.status,
      notes: item.notes || "",
      link: item.link || "",
    });
    setLinkError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const trimmedLink = formData.link.trim();
    if (trimmedLink !== "") {
      if (!/^https?:\/\//i.test(trimmedLink)) {
        setLinkError("Link must start with http:// or https://");
        return;
      }
      try {
        new URL(trimmedLink);
      } catch {
        setLinkError("Please enter a valid URL");
        return;
      }
    }
    setLinkError(null);
    setSaving(true);

    const payload = {
      name: formData.name,
      type: formData.type,
      eventId: formData.eventId || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      status: formData.status,
      notes: formData.notes || null,
      link: trimmedLink || null,
    };

    try {
      const url = editingItem ? `/api/outfits/${editingItem.id}` : "/api/outfits";
      const method = editingItem ? "PATCH" : "POST";
      const isAdd = !editingItem;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (isAdd) setActiveTab("All");
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
      const res = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  if (loading) return <OutfitsSkeleton />;

  // Build event tabs from actual events
  const eventTabNames = events.map((e) => e.name);
  const filteredItems =
    activeTab === "All"
      ? items
      : items.filter((item) => item.event?.name === activeTab);

  const totalCost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Outfit & Jewellery
          </h1>
          <p className="mt-1 text-on-surface-variant text-sm font-label">
            {items.length} items &middot; Total: {formatCurrency(totalCost)}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Item
        </button>
      </div>

      {/* ─── Event Tabs ─── */}
      <div className="bg-surface-container p-1 rounded-full shadow-inner flex items-center overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("All")}
          className={`px-5 py-2.5 rounded-full text-sm font-label transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "All"
              ? "gold-gradient text-white shadow-lg"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          All
        </button>
        {eventTabNames.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-full text-sm font-label transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab
                ? "gold-gradient text-white shadow-lg"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(
          [
            "NOT_ORDERED",
            "NOT_PAID",
            "ORDERED",
            "RECEIVED",
            "ALTERED",
            "READY",
          ] as ItemStatus[]
        ).map(
          (status) => {
            const count = items.filter((i) => i.status === status).length;
            return (
              <div
                key={status}
                className="bg-surface-container-lowest rounded-2xl p-4 ambient-shadow ghost-border text-center"
              >
                <Icon name={statusIcons[status]} className="text-primary/40 text-xl" />
                <p className="font-headline text-2xl text-on-surface mt-1">
                  {count}
                </p>
                <p className="text-[11px] text-on-surface-variant uppercase tracking-wider mt-0.5 font-label">
                  {statusLabels[status]}
                </p>
              </div>
            );
          }
        )}
      </div>

      {/* ─── Item Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border flex flex-col gap-4 hover:shadow-lg transition-all"
          >
            {/* Icon + name */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                <Icon name={typeIcons[item.type] || "checkroom"} className="text-primary text-xl" />
              </div>
              <div className="min-w-0">
                <h3 className="font-headline text-lg text-on-surface leading-tight">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-label font-medium tracking-wide ${
                      typeStyles[item.type]?.bg || ""
                    } ${typeStyles[item.type]?.text || ""}`}
                  >
                    {typeLabels[item.type] || item.type}
                  </span>
                  {item.event && (
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-label text-on-surface-variant tracking-wide">
                      {item.event.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {item.notes && (
              <p className="text-xs text-on-surface-variant/70 leading-relaxed font-label">
                {item.notes}
              </p>
            )}

            {/* Divider */}
            <div className="border-t border-outline-variant/30" />

            {/* Cost & status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline text-xl text-on-surface">
                  {item.cost != null ? formatCurrency(item.cost) : "\u2014"}
                </span>
                {item.link && (() => {
                  let hostname = item.link;
                  try {
                    hostname = new URL(item.link).hostname;
                  } catch {
                    // Invalid URL - keep raw link as title
                  }
                  return (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={hostname}
                      className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-primary-container/30 text-on-surface-variant hover:text-primary flex items-center justify-center transition-all"
                    >
                      <Icon name="open_in_new" className="text-base" />
                    </a>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1.5">
                <Icon name={statusIcons[item.status]} className={`text-sm ${
                    item.status === "READY"
                      ? "text-secondary"
                      : item.status === "ORDERED"
                      ? "text-tertiary"
                      : item.status === "NOT_PAID"
                      ? "text-amber-700"
                      : item.status === "NOT_ORDERED"
                      ? "text-on-surface-variant"
                      : "text-primary"
                  }`} />
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-label font-medium ${
                    statusStyles[item.status]
                  }`}
                >
                  {statusLabels[item.status]}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(item)}
                className="flex-1 py-2 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="edit" className="text-sm" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="py-2 px-3 rounded-xl border border-outline-variant/40 text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
              >
                <Icon name="delete" className="text-sm" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Icon name="checkroom" className="text-5xl text-on-surface-variant/20" />
            <p className="mt-4 text-on-surface-variant/50 font-label text-sm">
              {activeTab === "All"
                ? "No items yet. Add your first outfit or jewellery item!"
                : "No items found for this event."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Add/Edit Item Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Emerald Green Lehenga"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ItemType })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {(["OUTFIT", "JEWELLERY", "ACCESSORY"] as ItemType[]).map((t) => (
                      <option key={t} value={t}>{typeLabels[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Event
                  </label>
                  {events.length > 0 ? (
                    <select
                      value={formData.eventId}
                      onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                      className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <option value="">None</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface-variant/60">
                        Add events in Timeline first
                      </div>
                      <a
                        href="/dashboard/timeline"
                        className="inline-flex items-center gap-1 text-xs font-label text-primary/70 hover:text-primary transition-colors"
                      >
                        <Icon name="arrow_forward" className="text-sm" />
                        Go to Timeline to add events
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Cost
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cost ? formatNumber(formData.cost) : ""}
                    onChange={(e) => setFormData({ ...formData, cost: parseNumber(e.target.value) })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {(
                      [
                        "NOT_ORDERED",
                        "NOT_PAID",
                        "ORDERED",
                        "RECEIVED",
                        "ALTERED",
                        "READY",
                      ] as ItemStatus[]
                    ).map((s) => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Purchase link <span className="normal-case tracking-normal text-on-surface-variant/60 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => {
                    setFormData({ ...formData, link: e.target.value });
                    if (linkError) setLinkError(null);
                  }}
                  className={`w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 transition-all ${
                    linkError
                      ? "ring-2 ring-error/50 focus:ring-error/40"
                      : "focus:ring-primary/20"
                  }`}
                  placeholder="https://..."
                />
                {linkError ? (
                  <p className="mt-1.5 text-xs font-label text-error">
                    {linkError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs font-label text-on-surface-variant/60">
                    Add a link if you&apos;re buying online — saves you searching later.
                  </p>
                )}
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
                  placeholder="Any notes about the item..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingItem(null); setLinkError(null); }}
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
