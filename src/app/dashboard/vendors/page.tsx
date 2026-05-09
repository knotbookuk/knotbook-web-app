"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatNumber, parseNumber } from "@/lib/format";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface VendorPayment {
  id: string;
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  quoteAmount: number | null;
  depositAmount: number | null;
  rating: number | null;
  status: string;
  notes: string | null;
  payments: VendorPayment[];
  _count: { payments: number };
}

type VendorStatus =
  | "POTENTIAL"
  | "CONTACTED"
  | "QUOTE_RECEIVED"
  | "CONFIRMED"
  | "DEPOSIT_PAID"
  | "PAID_IN_FULL"
  | "CANCELLED";

const statusLabels: Record<string, string> = {
  POTENTIAL: "Potential / not yet contacted",
  CONTACTED: "Contacted",
  QUOTE_RECEIVED: "Quote received",
  CONFIRMED: "Confirmed",
  DEPOSIT_PAID: "Deposit paid",
  PAID_IN_FULL: "Paid in full",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<string, string> = {
  POTENTIAL: "bg-surface-container-low text-on-surface-variant/80",
  CONTACTED: "bg-surface-container text-on-surface-variant",
  QUOTE_RECEIVED: "bg-tertiary-container/30 text-on-tertiary-container",
  CONFIRMED: "bg-tertiary-container/40 text-on-tertiary-container",
  DEPOSIT_PAID: "bg-primary-container/20 text-primary",
  PAID_IN_FULL: "bg-secondary-container/40 text-on-secondary-container",
  CANCELLED: "bg-error-container/40 text-on-error-container",
};

const statusIcons: Record<string, string> = {
  POTENTIAL: "person_search",
  CONTACTED: "schedule",
  QUOTE_RECEIVED: "request_quote",
  CONFIRMED: "event_available",
  DEPOSIT_PAID: "savings",
  PAID_IN_FULL: "check_circle",
  CANCELLED: "cancel",
};

// Filter pill order: All → Potential → Contacted → Quote received → Confirmed → Deposit paid → Paid in full → Cancelled
const statusFilterOrder: VendorStatus[] = [
  "POTENTIAL",
  "CONTACTED",
  "QUOTE_RECEIVED",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "PAID_IN_FULL",
  "CANCELLED",
];

const categoryIcons: Record<string, string> = {
  Photographer: "photo_camera",
  Videographer: "videocam",
  Florist: "local_florist",
  Caterer: "restaurant",
  DJ: "music_note",
  Venue: "location_on",
  Decorator: "palette",
  MUA: "brush",
  Baker: "cake",
  Planner: "event_note",
};

const defaultFormData = {
  name: "",
  category: "",
  contactName: "",
  email: "",
  phone: "",
  quoteAmount: "",
  depositAmount: "",
  rating: "",
  status: "CONTACTED" as string,
  notes: "",
};

/* ─── Skeleton ─── */
function VendorsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-64 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-48 bg-surface-container rounded-lg" />
        </div>
        <div className="h-12 w-36 bg-surface-container rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
      <div className="h-14 bg-surface-container-low rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-surface-container-low rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (Array.isArray(data)) setVendors(data);
    } catch {
      // silently fail
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingVendor(null);
    setFormData(defaultFormData);
    setModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      contactName: vendor.contactName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      quoteAmount: vendor.quoteAmount?.toString() || "",
      depositAmount: vendor.depositAmount?.toString() || "",
      rating: vendor.rating?.toString() || "",
      status: vendor.status,
      notes: vendor.notes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) return;
    setSaving(true);

    const payload = {
      name: formData.name,
      category: formData.category,
      contactName: formData.contactName || null,
      email: formData.email || null,
      phone: formData.phone || null,
      quoteAmount: formData.quoteAmount ? parseFloat(formData.quoteAmount) : null,
      depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : null,
      rating: formData.rating ? parseInt(formData.rating) : null,
      status: formData.status,
      notes: formData.notes || null,
    };

    try {
      const url = editingVendor ? `/api/vendors/${editingVendor.id}` : "/api/vendors";
      const method = editingVendor ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchVendors();
        setModalOpen(false);
        setFormData(defaultFormData);
        setEditingVendor(null);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
      }
    } catch {
      // silently fail
    }
  };

  if (loading) return <VendorsSkeleton />;

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total Vendors", value: vendors.length.toString(), icon: "storefront" },
    { label: "Confirmed", value: vendors.filter((v) => ["CONFIRMED", "DEPOSIT_PAID", "PAID_IN_FULL"].includes(v.status)).length.toString(), icon: "check_circle" },
    { label: "In Progress", value: vendors.filter((v) => ["POTENTIAL", "CONTACTED", "QUOTE_RECEIVED"].includes(v.status)).length.toString(), icon: "pending" },
    { label: "Total Quoted", value: formatCurrency(vendors.reduce((sum, v) => sum + Number(v.quoteAmount || 0), 0)), icon: "payments" },
  ];

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Vendor Directory
          </h1>
          <p className="mt-1 text-on-surface-variant text-sm font-label">
            Manage your wedding vendors and payments
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Vendor
        </button>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center"
          >
            <Icon name={stat.icon} className="text-primary/40 text-2xl" />
            <p className="font-headline text-3xl text-on-surface mt-1">
              {stat.value}
            </p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
        <input
          type="text"
          placeholder="Search vendors by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-container-lowest rounded-2xl py-3.5 pl-12 pr-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* ─── Vendor Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border flex flex-col gap-4 hover:shadow-lg transition-all"
          >
            {/* Top row: name + category */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-surface-container-low flex items-center justify-center">
                  <Icon name={categoryIcons[vendor.category] || "storefront"} className="text-primary text-xl" />
                </div>
                <div>
                  <h3 className="font-headline text-lg text-on-surface leading-tight">
                    {vendor.name}
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary text-[11px] font-label font-medium tracking-wide">
                    {vendor.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5">
              {vendor.phone && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-label">
                  <Icon name="call" className="text-sm text-on-surface-variant/50" />
                  {vendor.phone}
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-label">
                  <Icon name="mail" className="text-sm text-on-surface-variant/50" />
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
              {vendor.contactName && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-label">
                  <Icon name="person" className="text-sm text-on-surface-variant/50" />
                  {vendor.contactName}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-outline-variant/30" />

            {/* Payment & rating row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name={statusIcons[vendor.status] || "help"} className={`text-sm ${
                    vendor.status === "PAID_IN_FULL"
                      ? "text-secondary"
                      : vendor.status === "CANCELLED"
                      ? "text-error"
                      : vendor.status === "POTENTIAL"
                      ? "text-on-surface-variant/60"
                      : "text-tertiary"
                  }`} />
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-label font-medium ${
                    statusStyles[vendor.status] || "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {statusLabels[vendor.status] || vendor.status}
                </span>
                {vendor.quoteAmount != null && (
                  <span className="text-xs text-on-surface-variant font-label ml-1">
                    {formatCurrency(vendor.quoteAmount)}
                  </span>
                )}
              </div>
              {vendor.rating != null && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon name="star" className={`text-sm ${ i < (vendor.rating ?? 0) ? "text-primary" : "text-outline-variant/40" }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(vendor)}
                className="flex-1 py-2 rounded-xl border border-outline-variant/40 text-xs font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="edit" className="text-sm" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(vendor.id)}
                className="py-2 px-3 rounded-xl border border-outline-variant/40 text-on-surface-variant/50 hover:text-error hover:border-error/30 transition-all cursor-pointer"
              >
                <Icon name="delete" className="text-sm" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredVendors.length === 0 && !loading && (
        <div className="text-center py-16">
          <Icon name="storefront" className="text-5xl text-primary/20" />
          <p className="mt-4 text-on-surface-variant/50 font-label text-sm">
            {search ? "No vendors match your search." : "No vendors yet. Add your first vendor!"}
          </p>
        </div>
      )}

      {/* ─── Add/Edit Vendor Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="font-headline text-2xl text-on-surface mb-6">
              {editingVendor ? "Edit Vendor" : "Add New Vendor"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="Vendor name"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Photographer"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Contact person"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="+44 7..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Quote Amount
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.quoteAmount ? formatNumber(formData.quoteAmount) : ""}
                    onChange={(e) => setFormData({ ...formData, quoteAmount: parseNumber(e.target.value) })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Deposit
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.depositAmount ? formatNumber(formData.depositAmount) : ""}
                    onChange={(e) => setFormData({ ...formData, depositAmount: parseNumber(e.target.value) })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                    Rating (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="5"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                >
                  {statusFilterOrder.map((s) => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
                >
                  {saving ? "Saving..." : editingVendor ? "Update Vendor" : "Add Vendor"}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingVendor(null); }}
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
