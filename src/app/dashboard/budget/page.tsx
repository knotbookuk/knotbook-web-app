"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatNumber, parseNumber } from "@/lib/format";
import Icon from "@/components/Icon";

/* ─── Types ─── */

type BudgetStatus = "PAID" | "PARTIALLY_PAID" | "DUE" | "OVERDUE";

interface BudgetItem {
  id: string;
  category: string;
  description: string | null;
  estimatedCost: number;
  actualCost: number;
  paidAmount: number;
  dueDate: string | null;
  status: BudgetStatus;
  notes: string | null;
  sortOrder: number;
}

interface BudgetTotals {
  budget: number;
  estimated: number;
  actual: number;
  paid: number;
  remaining: number;
}

/* ─── Helpers ─── */

function statusLabel(status: BudgetStatus): string {
  switch (status) {
    case "PAID": return "Paid";
    case "PARTIALLY_PAID": return "Partial";
    case "DUE": return "Due";
    case "OVERDUE": return "Overdue";
  }
}

function statusPill(status: BudgetStatus) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-label font-medium">
        <Icon name="check_circle" className="text-xs" />
        Paid
      </span>
    );
  }
  if (status === "DUE") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/15 text-primary text-xs font-label font-medium">
        <Icon name="schedule" className="text-xs" />
        Due
      </span>
    );
  }
  if (status === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error-container/25 text-error text-xs font-label font-medium">
        <Icon name="warning" className="text-xs" />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary-container/15 text-tertiary text-xs font-label font-medium">
      <Icon name="hourglass_top" className="text-xs" />
      Partial
    </span>
  );
}

const categoryIcons: Record<string, string> = {
  Venue: "location_on",
  Photography: "photo_camera",
  Flowers: "local_florist",
  Entertainment: "music_note",
  Catering: "restaurant",
  Attire: "checkroom",
  Decor: "palette",
  Transport: "directions_car",
  Stationery: "mail",
  Gifts: "redeem",
};

function getCategoryIcon(category: string): string {
  return categoryIcons[category] || "receipt_long";
}

/* ─── Donut Chart (SVG) ─── */

function DonutChart({ items, totalEstimated }: { items: BudgetItem[]; totalEstimated: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const colors = ["#d4af37", "#735c00", "#e9c349", "#7f7663", "#b8860b", "#a39171", "#c9a84c", "#5a4a2f"];

  // Group by category and calculate percentages
  const categoryMap = new Map<string, number>();
  items.forEach((item) => {
    const prev = categoryMap.get(item.category) || 0;
    categoryMap.set(item.category, prev + Number(item.estimatedCost));
  });

  const segments = Array.from(categoryMap.entries()).map(([label, amount], i) => ({
    label,
    pct: totalEstimated > 0 ? (amount / totalEstimated) * 100 : 0,
    color: colors[i % colors.length],
  }));

  let cumulativeOffset = 0;

  return (
    <div>
      <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
        {segments.map((seg) => {
          const dashLength = (seg.pct / 100) * circumference;
          const dashOffset = circumference - cumulativeOffset;
          cumulativeOffset += dashLength;

          return (
            <circle
              key={seg.label}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="24"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
        {/* Centre label */}
        <text x="100" y="94" textAnchor="middle" className="fill-on-surface font-headline text-[14px]">
          Budget
        </text>
        <text x="100" y="116" textAnchor="middle" className="fill-primary font-headline text-[18px] font-semibold">
          {formatCurrency(totalEstimated)}
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-6 space-y-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-sm text-on-surface font-label">{seg.label}</span>
            </div>
            <span className="text-sm text-on-surface-variant font-label font-medium">
              {seg.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function BudgetSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Header skeleton */}
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="h-12 w-64 bg-surface-container-low rounded-xl" />
          <div className="mt-2 h-5 w-96 bg-surface-container-low rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-surface-container-low rounded-2xl" />
      </section>

      {/* Stats skeleton */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow ghost-border text-center">
            <div className="h-6 w-6 bg-surface-container-low rounded-full mx-auto" />
            <div className="h-9 w-28 bg-surface-container-low rounded-lg mx-auto mt-2" />
            <div className="h-4 w-24 bg-surface-container-low rounded-md mx-auto mt-2" />
          </div>
        ))}
      </section>

      {/* Table skeleton */}
      <section className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="bg-surface-container-lowest rounded-2xl ambient-shadow ghost-border overflow-hidden">
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-5 w-32 bg-surface-container-low rounded-md" />
                  <div className="flex-1" />
                  <div className="h-5 w-20 bg-surface-container-low rounded-md" />
                  <div className="h-5 w-20 bg-surface-container-low rounded-md" />
                  <div className="h-5 w-20 bg-surface-container-low rounded-md" />
                  <div className="h-6 w-16 bg-surface-container-low rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:w-[380px] shrink-0">
          <div className="bg-surface-container-lowest rounded-2xl p-6 ambient-shadow ghost-border h-80" />
        </div>
      </section>
    </div>
  );
}

/* ─── Budget Modal ─── */

interface BudgetFormData {
  category: string;
  description: string;
  estimatedCost: string;
  actualCost: string;
  paidAmount: string;
  dueDate: string;
  status: BudgetStatus;
}

const emptyForm: BudgetFormData = {
  category: "",
  description: "",
  estimatedCost: "",
  actualCost: "",
  paidAmount: "",
  dueDate: "",
  status: "DUE",
};

function BudgetModal({
  editingItem,
  onClose,
  onSaved,
}: {
  editingItem: BudgetItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingItem !== null;
  const [form, setForm] = useState<BudgetFormData>(() => {
    if (editingItem) {
      return {
        category: editingItem.category,
        description: editingItem.description || "",
        estimatedCost: String(editingItem.estimatedCost),
        actualCost: String(editingItem.actualCost),
        paidAmount: String(editingItem.paidAmount),
        dueDate: editingItem.dueDate ? editingItem.dueDate.slice(0, 10) : "",
        status: editingItem.status,
      };
    }
    return emptyForm;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category.trim()) {
      setError("Category is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      category: form.category.trim(),
      description: form.description.trim() || null,
      estimatedCost: parseFloat(form.estimatedCost) || 0,
      actualCost: parseFloat(form.actualCost) || 0,
      paidAmount: parseFloat(form.paidAmount) || 0,
      dueDate: form.dueDate || null,
      status: form.status,
    };

    try {
      const url = isEditing ? `/api/budget/${editingItem.id}` : "/api/budget";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl text-on-surface">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="close" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/20 text-error text-sm font-label">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
              Category *
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Venue, Photography, Flowers"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Cost fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Estimated
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.estimatedCost ? formatNumber(form.estimatedCost) : ""}
                onChange={(e) => setForm({ ...form, estimatedCost: parseNumber(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Actual
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.actualCost ? formatNumber(form.actualCost) : ""}
                onChange={(e) => setForm({ ...form, actualCost: parseNumber(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Paid
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.paidAmount ? formatNumber(form.paidAmount) : ""}
                onChange={(e) => setForm({ ...form, paidAmount: parseNumber(e.target.value) })}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Due Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                min={form.status === "PAID" ? undefined : new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BudgetStatus })}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="DUE">Due</option>
                <option value="PARTIALLY_PAID">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl ghost-border text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="gold-gradient text-white px-6 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {saving ? "Saving..." : isEditing ? "Update" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteConfirmModal({
  itemName,
  onConfirm,
  onClose,
}: {
  itemName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-sm sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <Icon name="delete_forever" className="text-error text-4xl mb-3" />
          <h3 className="font-headline text-xl text-on-surface mb-2">Delete Expense</h3>
          <p className="text-sm text-on-surface-variant font-label">
            Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl ghost-border text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-error text-white text-sm font-label font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Component ─── */

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [totals, setTotals] = useState<BudgetTotals>({ budget: 0, estimated: 0, actual: 0, paid: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [paymentsOpen, setPaymentsOpen] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);

  const fetchBudget = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/budget");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
      setTotals(data.totals || { budget: 0, estimated: 0, actual: 0, paid: 0, remaining: 0 });
    } catch {
      // Silently handle - items will be empty
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    setEditingItem(null);
    fetchBudget();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteClick = (item: BudgetItem) => {
    setDeleteTarget(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/budget/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteTarget(null);
      fetchBudget();
    } catch {
      // Could show error toast
      setDeleteTarget(null);
    }
  };

  // Computed totals from live data
  const sumEstimated = items.reduce((s, r) => s + Number(r.estimatedCost), 0);
  const sumActual = items.reduce((s, r) => s + Number(r.actualCost), 0);
  const sumPaid = items.reduce((s, r) => s + Number(r.paidAmount), 0);

  // Upcoming payments: items that are DUE or OVERDUE with a dueDate
  const upcomingPayments = items
    .filter((item) => (item.status === "DUE" || item.status === "OVERDUE" || item.status === "PARTIALLY_PAID") && item.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6);

  if (loading) return <BudgetSkeleton />;

  return (
    <div className="space-y-10 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface leading-tight">
            Budget Tracker
          </h1>
          <p className="mt-2 italic text-on-surface-variant/70 font-body text-base">
            Every detail accounted for, so you can focus on the joy.
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="gold-gradient text-white px-6 py-3 rounded-2xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="add" className="text-lg" />
          Add Expense
        </button>
      </section>

      {/* ─── Top Stats ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Estimated */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow ghost-border text-center">
          <Icon name="savings" className="text-primary/40 text-2xl mb-1" />
          <p className="font-headline text-3xl text-primary mt-1">
            {formatCurrency(totals.estimated)}
          </p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Total Estimated
          </p>
        </div>

        {/* Total Actual */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow ghost-border text-center">
          <Icon name="account_balance_wallet" className="text-primary/40 text-2xl mb-1" />
          <p className="font-headline text-3xl text-on-surface mt-1">
            {formatCurrency(totals.actual)}
          </p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Total Actual
          </p>
        </div>

        {/* Remaining */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow ghost-border text-center">
          <Icon name="trending_up" className="text-primary/40 text-2xl mb-1" />
          <p className="font-headline text-3xl text-on-surface mt-1">
            {formatCurrency(totals.remaining)}
          </p>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
            Remaining
          </p>
        </div>
      </section>

      {/* ─── Two-Column Layout: Table + Sidebar ─── */}
      <section className="flex flex-col lg:flex-row gap-6">
        {/* Left: Budget Table */}
        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl ambient-shadow ghost-border p-12 text-center">
              <Icon name="savings" className="text-primary/30 text-5xl mb-3" />
              <h3 className="font-headline text-xl text-on-surface mb-2">No expenses yet</h3>
              <p className="text-sm text-on-surface-variant font-label mb-4">
                Start tracking your budget by adding your first expense.
              </p>
              <button
                onClick={handleAdd}
                className="gold-gradient text-white px-6 py-3 rounded-2xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Icon name="add" className="text-lg" />
                Add Expense
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-surface-container-lowest rounded-2xl ambient-shadow ghost-border overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium">
                        Category
                      </th>
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium text-right">
                        Estimated
                      </th>
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium text-right">
                        Actual
                      </th>
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium text-right">
                        Paid
                      </th>
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium text-center">
                        Status
                      </th>
                      <th className="px-4 py-4 text-xs uppercase tracking-wider text-on-surface-variant font-label font-medium text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-outline-variant/20 hover:bg-surface-container-low/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Icon name={getCategoryIcon(row.category)} className="text-primary/50 text-lg" />
                            <div>
                              <span className="text-sm font-medium text-on-surface">{row.category}</span>
                              {row.description && (
                                <p className="text-xs text-on-surface-variant/60 mt-0.5">{row.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant text-right font-label">
                          {formatCurrency(Number(row.estimatedCost))}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface text-right font-label font-medium">
                          {formatCurrency(Number(row.actualCost))}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant text-right font-label">
                          {formatCurrency(Number(row.paidAmount))}
                        </td>
                        <td className="px-4 py-4 text-center">{statusPill(row.status)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(row)}
                              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Icon name="edit" className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(row)}
                              className="p-1.5 rounded-lg hover:bg-error-container/20 text-on-surface-variant/60 hover:text-error transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Icon name="delete" className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container-low/50">
                      <td className="px-4 py-4 text-sm font-headline font-semibold text-on-surface">
                        Totals
                      </td>
                      <td className="px-4 py-4 text-sm font-label font-semibold text-on-surface-variant text-right">
                        {formatCurrency(sumEstimated)}
                      </td>
                      <td className="px-4 py-4 text-sm font-label font-semibold text-on-surface text-right">
                        {formatCurrency(sumActual)}
                      </td>
                      <td className="px-4 py-4 text-sm font-label font-semibold text-on-surface-variant text-right">
                        {formatCurrency(sumPaid)}
                      </td>
                      <td className="px-4 py-4" />
                      <td className="px-4 py-4" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-4">
                {items.map((row) => (
                  <div
                    key={row.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon name={getCategoryIcon(row.category)} className="text-primary/50 text-lg" />
                        <div>
                          <span className="text-sm font-medium text-on-surface">{row.category}</span>
                          {row.description && (
                            <p className="text-xs text-on-surface-variant/60">{row.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {statusPill(row.status)}
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Icon name="edit" className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(row)}
                          className="p-1.5 rounded-lg hover:bg-error-container/20 text-on-surface-variant/60 hover:text-error transition-colors cursor-pointer"
                        >
                          <Icon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                          Estimated
                        </p>
                        <p className="text-sm font-label font-medium text-on-surface-variant mt-0.5">
                          {formatCurrency(Number(row.estimatedCost))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                          Actual
                        </p>
                        <p className="text-sm font-label font-medium text-on-surface mt-0.5">
                          {formatCurrency(Number(row.actualCost))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                          Paid
                        </p>
                        <p className="text-sm font-label font-medium text-on-surface-variant mt-0.5">
                          {formatCurrency(Number(row.paidAmount))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Totals */}
                <div className="bg-surface-container-low/60 rounded-2xl p-5 ghost-border">
                  <p className="text-sm font-headline font-semibold text-on-surface mb-2">Totals</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                        Estimated
                      </p>
                      <p className="text-sm font-label font-semibold text-on-surface-variant mt-0.5">
                        {formatCurrency(sumEstimated)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                        Actual
                      </p>
                      <p className="text-sm font-label font-semibold text-on-surface mt-0.5">
                        {formatCurrency(sumActual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                        Paid
                      </p>
                      <p className="text-sm font-label font-semibold text-on-surface-variant mt-0.5">
                        {formatCurrency(sumPaid)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:w-[300px] shrink-0 space-y-6">
          {/* Allocation Donut Chart */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 ambient-shadow ghost-border">
            <h2 className="font-headline text-xl text-on-surface mb-4">Budget Allocation</h2>
            {items.length > 0 ? (
              <DonutChart items={items} totalEstimated={sumEstimated} />
            ) : (
              <div className="text-center py-8">
                <Icon name="pie_chart" className="text-on-surface-variant/30 text-4xl" />
                <p className="text-sm text-on-surface-variant/60 mt-2 font-label">Add expenses to see allocation</p>
              </div>
            )}
          </div>

          {/* Planning Tip */}
          <div className="gold-gradient rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="lightbulb" className="text-xl" />
              <h3 className="font-headline text-lg">Planning Tip</h3>
            </div>
            <p className="text-sm leading-relaxed opacity-90">
              Keep 5-10% of your total budget as a contingency fund for unexpected costs. This
              ensures last-minute additions never derail your special day.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Upcoming Payments (Collapsible) ─── */}
      {upcomingPayments.length > 0 && (
        <section className="bg-surface-container-lowest rounded-2xl ambient-shadow ghost-border overflow-hidden">
          <details open={paymentsOpen} onToggle={(e) => setPaymentsOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="flex items-center justify-between px-6 py-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-3">
                <Icon name="upcoming" className="text-primary/50 text-xl" />
                <h2 className="font-headline text-xl text-on-surface">Upcoming Payments</h2>
                <span className="bg-primary-container/15 text-primary text-xs font-label font-medium px-2 py-0.5 rounded-full">
                  {upcomingPayments.length}
                </span>
              </div>
              <Icon name="expand_more" className={`text-on-surface-variant transition-transform duration-300 ${
                  paymentsOpen ? "rotate-180" : ""
                }`} />
            </summary>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcomingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-surface-container-low rounded-2xl p-5 ghost-border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEdit(payment)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center">
                        <Icon name={getCategoryIcon(payment.category)} className="text-primary text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{payment.category}</p>
                        {payment.description && (
                          <p className="text-xs text-on-surface-variant">{payment.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                          Amount Due
                        </p>
                        <p className="font-headline text-xl text-primary">
                          {formatCurrency(Number(payment.actualCost) - Number(payment.paidAmount))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">
                          Due
                        </p>
                        <p className="text-sm text-on-surface-variant font-label">
                          {payment.dueDate
                            ? new Date(payment.dueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "No date"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </section>
      )}

      {/* ─── Modals ─── */}
      {modalOpen && (
        <BudgetModal
          editingItem={editingItem}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          itemName={deleteTarget.category}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
