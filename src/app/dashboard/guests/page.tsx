"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

// ─── Types matching the Prisma schema / API ───

type RsvpStatus = "ATTENDING" | "NOT_COMING" | "NO_RESPONSE";
type FamilySide = "BRIDE" | "GROOM" | "MUTUAL";
type FilterTab = "All" | "ATTENDING" | "NOT_COMING" | "NO_RESPONSE";

interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  familySide: FamilySide;
  rsvpStatus: RsvpStatus;
  mealPreference: string | null;
  dietaryType: string | null;
  allergies: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  plusOnes: number;
  notes: string | null;
  rsvpToken: string | null;
}

interface GuestFormData {
  name: string;
  email: string;
  phone: string;
  familySide: FamilySide;
  rsvpStatus: RsvpStatus;
  mealPreference: string;
  dietaryType: string;
  plusOne: boolean;
  plusOnes: number;
  notes: string;
}

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

const EMPTY_FORM: GuestFormData = {
  name: "",
  email: "",
  phone: "",
  familySide: "MUTUAL",
  rsvpStatus: "NO_RESPONSE",
  mealPreference: "",
  dietaryType: "",
  plusOne: false,
  plusOnes: 0,
  notes: "",
};

const filterTabs: { label: string; value: FilterTab }[] = [
  { label: "All", value: "All" },
  { label: "Attending", value: "ATTENDING" },
  { label: "Not Coming", value: "NOT_COMING" },
  { label: "No Response", value: "NO_RESPONSE" },
];

const RSVP_LABELS: Record<RsvpStatus, string> = {
  ATTENDING: "Attending",
  NOT_COMING: "Not Coming",
  NO_RESPONSE: "No Response",
};

const SIDE_LABELS: Record<FamilySide, string> = {
  BRIDE: "Bride",
  GROOM: "Groom",
  MUTUAL: "Mutual",
};

// ─── Helpers ───

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function statusPill(status: RsvpStatus) {
  const styles: Record<RsvpStatus, string> = {
    ATTENDING: "bg-emerald-100 text-emerald-700",
    NOT_COMING: "bg-rose-100 text-rose-700",
    NO_RESPONSE: "bg-stone-100 text-stone-500",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-label font-medium ${styles[status]}`}
    >
      {RSVP_LABELS[status]}
    </span>
  );
}

// ─── Skeleton Loader ───

function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/10 last:border-b-0 animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-stone-200 rounded" />
            <div className="h-3 w-44 bg-stone-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-20 bg-stone-200 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-stone-200 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-16 bg-stone-200 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="h-8 w-16 bg-stone-100 rounded ml-auto" />
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-stone-200 rounded" />
          <div className="h-3 w-44 bg-stone-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-stone-200 rounded-full" />
      </div>
      <div className="border-t border-outline-variant/15 pt-3 flex justify-between">
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-stone-100 rounded" />
          <div className="h-4 w-16 bg-stone-100 rounded" />
        </div>
        <div className="h-8 w-16 bg-stone-100 rounded" />
      </div>
    </div>
  );
}

// ─── Toast Component ───

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(onDismiss, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, onDismiss]);

  if (!toast.visible) return null;

  const bg =
    toast.type === "success"
      ? "bg-emerald-600"
      : "bg-rose-600";

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`${bg} text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-label text-sm`}
      >
        <Icon name={toast.type === "success" ? "check_circle" : "error"} className="text-lg" />
        {toast.message}
        <button onClick={onDismiss} className="cursor-pointer ml-2 hover:opacity-70 transition-opacity">
          <Icon name="close" className="text-base" />
        </button>
      </div>
    </div>
  );
}

// ─── Guest Form Modal ───

function GuestModal({
  open,
  onClose,
  onSubmit,
  initialData,
  isEditing,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GuestFormData) => void;
  initialData: GuestFormData;
  isEditing: boolean;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<GuestFormData>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClass =
    "w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface font-body border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-on-surface-variant/40";
  const labelClass =
    "block text-xs uppercase tracking-widest text-stone-400 font-label font-medium mb-1.5";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Panel */}
      <div className="relative bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl ambient-shadow ghost-border w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest rounded-t-3xl border-b border-outline-variant/15 px-6 py-5 flex items-center justify-between z-10">
          <h2 className="font-headline text-2xl text-on-surface">
            {isEditing ? "Edit Guest" : "Add Guest"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-20 sm:p-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="guest-name" className={labelClass}>
              Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="guest-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guest-email" className={labelClass}>
                Email
              </label>
              <input
                id="guest-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="guest-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="guest-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                pattern="^[+]?[0-9 ()\\-]{6,}$"
                title="Use international format, e.g. +44 7700 900000"
                value={form.phone}
                onChange={handleChange}
                placeholder="+44 7700 900000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Family Side + RSVP Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guest-familySide" className={labelClass}>
                Family Side
              </label>
              <select
                id="guest-familySide"
                name="familySide"
                value={form.familySide}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="BRIDE">Bride</option>
                <option value="GROOM">Groom</option>
                <option value="MUTUAL">Mutual</option>
              </select>
            </div>
            <div>
              <label htmlFor="guest-rsvpStatus" className={labelClass}>
                RSVP Status
              </label>
              <select
                id="guest-rsvpStatus"
                name="rsvpStatus"
                value={form.rsvpStatus}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="NO_RESPONSE">No Response</option>
                <option value="ATTENDING">Attending</option>
                <option value="NOT_COMING">Not Coming</option>
              </select>
            </div>
          </div>

          {/* Meal Preference + Dietary Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guest-mealPreference" className={labelClass}>
                Meal Preference
              </label>
              <input
                id="guest-mealPreference"
                name="mealPreference"
                type="text"
                value={form.mealPreference}
                onChange={handleChange}
                placeholder="e.g. Standard, Halal, Kosher"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="guest-dietaryType" className={labelClass}>
                Dietary Type
              </label>
              <input
                id="guest-dietaryType"
                name="dietaryType"
                type="text"
                value={form.dietaryType}
                onChange={handleChange}
                placeholder="e.g. Vegetarian, Vegan"
                className={inputClass}
              />
            </div>
          </div>

          {/* Additional Members */}
          <div>
            <label htmlFor="guest-plusOnes" className={labelClass}>
              Additional Members
            </label>
            <select
              id="guest-plusOnes"
              name="plusOnes"
              value={form.plusOnes}
              onChange={(e) => setForm((prev) => ({ ...prev, plusOnes: parseInt(e.target.value) }))}
              className={`${inputClass} cursor-pointer`}
            >
              <option value={0}>No additional members</option>
              <option value={1}>+1 member</option>
              <option value={2}>+2 members</option>
              <option value={3}>+3 members</option>
              <option value={4}>+4 members</option>
              <option value={5}>+5 members</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="guest-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="guest-notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-5 py-2.5 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="cursor-pointer gold-gradient text-white px-6 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon name="progress_activity" className="text-lg animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <>
                  <Icon name="save" className="text-lg" />
                  Save Changes
                </>
              ) : (
                <>
                  <Icon name="person_add" className="text-lg" />
                  Add Guest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───

function DeleteConfirmModal({
  open,
  guestName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  open: boolean;
  guestName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl ambient-shadow ghost-border w-full sm:max-w-sm px-5 pt-5 pb-20 sm:p-6 text-center max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="delete_forever" className="text-3xl text-rose-600" />
        </div>
        <h3 className="font-headline text-xl text-on-surface mb-2">
          Remove Guest
        </h3>
        <p className="text-sm text-on-surface-variant/70 font-body mb-6">
          Are you sure you want to remove{" "}
          <span className="font-medium text-on-surface">{guestName}</span> from
          the guest list? This action cannot be undone.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer px-5 py-2.5 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="cursor-pointer bg-rose-600 text-white px-5 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:bg-rose-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Icon name="progress_activity" className="text-lg animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Icon name="delete" className="text-lg" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ─── Main Page Component ──────────────────────────
// ═══════════════════════════════════════════════════

export default function GuestsPage() {
  // ─── Data State ───
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filter / Search State ───
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [familySideFilter, setFamilySideFilter] = useState<FamilySide | "">("");

  // ─── Pagination State ───
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // ─── Server-side stats (full guest list, not just current page) ───
  const [stats, setStats] = useState({
    totalGuests: 0,
    totalPlusOnes: 0,
    attending: 0,
    noResponse: 0,
    dietaryFlags: 0,
  });

  // ─── Modal State ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Delete State ───
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Toast State ───
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // ─── Fetch Guests ───

  const fetchGuests = useCallback(async () => {
    const start = Date.now();
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("paginate", "true");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (activeTab !== "All") {
        params.set("rsvpStatus", activeTab);
      }
      if (familySideFilter) {
        params.set("familySide", familySideFilter);
      }

      const res = await fetch(`/api/guests?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to fetch guests");
      }

      const data: {
        items: Guest[];
        total: number;
        page: number;
        pageSize: number;
        stats: typeof stats;
      } = await res.json();
      setGuests(data.items);
      setTotal(data.total);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch guests";
      setError(message);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  }, [searchQuery, activeTab, familySideFilter, page, pageSize]);

  // Reset to page 1 whenever filters/search change so the user doesn't end up
  // on an empty page after a narrowing filter.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab, familySideFilter]);

  // Single fetch effect — debounced for search, immediate for other changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetchGuests();
    }, searchQuery ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchGuests, searchQuery]);

  // ─── Add / Edit Guest ───

  const handleOpenAdd = () => {
    setEditingGuest(null);
    setModalOpen(true);
  };

  // ─── Import / Export / Invite ───

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; error: string }[];
  } | null>(null);

  const downloadCsvTemplate = () => {
    const header =
      "Name,Email,Phone,Family Side,RSVP Status,Meal Preference,Dietary Type,Allergies,Additional Members,Notes";
    const sample =
      'Jane Doe,jane@example.com,+44 7700 900000,MUTUAL,ATTENDING,Halal,Vegetarian,Nuts,1,"Sample row — delete before importing"';
    const csv = `${header}\n${sample}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knotbook-guest-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok && !data.imported) {
        throw new Error(data.error || "Import failed");
      }
      setImportResult({
        imported: data.imported || 0,
        skipped: data.skipped || 0,
        errors: data.errors || [],
      });
      if (data.imported > 0) {
        showToast(
          `Imported ${data.imported} guest${data.imported === 1 ? "" : "s"}${data.skipped ? ` · ${data.skipped} skipped` : ""}`,
          "success"
        );
        await fetchGuests();
      }
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setImporting(false);
    }
  };

  const exportGuestsCsv = () => {
    const header = [
      "Name",
      "Email",
      "Phone",
      "Family Side",
      "RSVP Status",
      "Meal Preference",
      "Dietary Type",
      "Allergies",
      "Additional Members",
      "Notes",
    ];
    const escape = (v: string | number | null | undefined) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const g of guests) {
      lines.push(
        [
          g.name,
          g.email,
          g.phone,
          g.familySide,
          g.rsvpStatus,
          g.mealPreference,
          g.dietaryType,
          g.allergies,
          g.plusOnes,
          g.notes,
        ]
          .map(escape)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guest-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inviteViaWhatsApp = (guest: Guest) => {
    if (!guest.phone) {
      showToast("This guest has no phone number on file.", "error");
      return;
    }
    // Strip everything except digits and leading + ; wa.me wants pure international digits.
    const digits = guest.phone.replace(/[^\d]/g, "");
    if (digits.length < 8) {
      showToast("Phone number looks invalid — add an international format.", "error");
      return;
    }
    const rsvpUrl = guest.rsvpToken
      ? `${window.location.origin}/rsvp/${guest.rsvpToken}`
      : window.location.origin;
    // Plain ASCII message — no emoji. The wa.me landing page (shown
    // in browsers without the WhatsApp app installed) uses a basic web
    // font with patchy emoji coverage and renders most emoji as "?"
    // tofu glyphs even when iOS/Android WhatsApp itself would render
    // them fine. Dropping the emoji entirely guarantees a clean preview
    // everywhere in the share chain.
    const emDash = "\u{2014}";
    const firstName = guest.name.split(" ")[0];
    const message = `Hi ${firstName}! You're invited to our wedding ${emDash} please RSVP here: ${rsvpUrl}`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGuest(null);
  };

  const handleSubmitGuest = async (formData: GuestFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingGuest
        ? `/api/guests/${editingGuest.id}`
        : "/api/guests";
      const method = editingGuest ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          familySide: formData.familySide,
          rsvpStatus: formData.rsvpStatus,
          mealPreference: formData.mealPreference || null,
          dietaryType: formData.dietaryType || null,
          plusOne: formData.plusOnes > 0,
          plusOnes: formData.plusOnes,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save guest");
      }

      handleCloseModal();
      showToast(
        editingGuest
          ? `${formData.name} updated successfully`
          : `${formData.name} added to the guest list`,
        "success"
      );
      await fetchGuests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save guest";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete Guest ───

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/guests/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete guest");
      }

      showToast(`${deleteTarget.name} removed from guest list`, "success");
      setDeleteTarget(null);
      await fetchGuests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete guest";
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Computed Stats (from server: full guest list) ───

  const totalGuests = stats.totalGuests;
  const totalPlusOnes = stats.totalPlusOnes;
  const totalAttendees = totalGuests + totalPlusOnes;
  const attendingCount = stats.attending;
  const pendingCount = stats.noResponse;
  const dietaryCount = stats.dietaryFlags;

  const statCards = [
    { label: "Total Attendees", value: String(totalAttendees), subtitle: totalPlusOnes > 0 ? `${totalGuests} guests + ${totalPlusOnes} additional` : undefined, icon: "group", color: "text-primary", bg: "text-primary/40" },
    { label: "Attending", value: String(attendingCount), icon: "check_circle", color: "text-emerald-600", bg: "text-emerald-600/40" },
    { label: "Pending", value: String(pendingCount), icon: "schedule", color: "text-stone-500", bg: "text-stone-500/45" },
    { label: "Dietary Flags", value: String(dietaryCount), icon: "restaurant", color: "text-tertiary", bg: "text-tertiary/40" },
  ];

  // ─── Modal initial data ───

  const modalInitialData: GuestFormData = editingGuest
    ? {
        name: editingGuest.name,
        email: editingGuest.email || "",
        phone: editingGuest.phone || "",
        familySide: editingGuest.familySide,
        rsvpStatus: editingGuest.rsvpStatus,
        mealPreference: editingGuest.mealPreference || "",
        dietaryType: editingGuest.dietaryType || "",
        plusOne: editingGuest.plusOne,
        plusOnes: editingGuest.plusOnes ?? 0,
        notes: editingGuest.notes || "",
      }
    : EMPTY_FORM;

  return (
    <div className="space-y-10 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Toast ─── */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* ─── Guest Form Modal ─── */}
      <GuestModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitGuest}
        initialData={modalInitialData}
        isEditing={!!editingGuest}
        isSubmitting={isSubmitting}
      />

      {/* ─── Delete Confirmation ─── */}
      <DeleteConfirmModal
        open={!!deleteTarget}
        guestName={deleteTarget?.name || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      {/* ─── Page Header ─── */}
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface leading-tight">
            Guest List &amp; RSVPs
          </h1>
          <p className="mt-2 italic text-on-surface-variant/70 font-body text-base">
            Track every invitation, response, and dietary need.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="cursor-pointer gold-gradient text-white px-5 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Icon name="person_add" className="text-lg" />
            Add Guest
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="cursor-pointer ghost-border bg-surface-container-lowest text-on-surface px-5 py-2.5 rounded-xl font-label text-sm font-medium hover:border-primary/40 transition-all flex items-center gap-2"
          >
            <Icon name="upload" className="text-lg text-primary" />
            Import CSV
          </button>
          <button
            onClick={exportGuestsCsv}
            disabled={guests.length === 0}
            className="cursor-pointer ghost-border bg-surface-container-lowest text-on-surface px-5 py-2.5 rounded-xl font-label text-sm font-medium hover:border-primary/40 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="download" className="text-lg text-primary" />
            Export CSV
          </button>
        </div>
      </section>

      {/* ─── Stats Bar ─── matches the small-icon-top-left pattern used on
            the main Dashboard and Tasks pages. The previous watermark
            (large faded icon top-right) didn't scale well to Lucide stroke
            icons and looked oversized on mobile. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border"
          >
            <Icon name={stat.icon} className={`text-2xl mb-3 ${stat.color}`} />
            <p className="text-[11px] uppercase tracking-widest text-on-surface-variant/70 font-label mb-1">
              {stat.label}
            </p>
            <p className={`font-headline text-3xl ${stat.color}`}>
              {loading ? "..." : stat.value}
            </p>
            {"subtitle" in stat && stat.subtitle && !loading && (
              <p className="text-[11px] text-on-surface-variant/60 font-label mt-1">
                {stat.subtitle}
              </p>
            )}
          </div>
        ))}
      </section>

      {/* ─── Filter / Search Bar ─── */}
      <section className="space-y-4">
        {/* Search + Family Side Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-surface-container rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface font-body border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-on-surface-variant/40"
            />
          </div>
          <select
            value={familySideFilter}
            onChange={(e) => setFamilySideFilter(e.target.value as FamilySide | "")}
            className="cursor-pointer bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface font-label border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
          >
            <option value="">All Sides</option>
            <option value="BRIDE">Bride</option>
            <option value="GROOM">Groom</option>
            <option value="MUTUAL">Mutual</option>
          </select>
        </div>

        {/* RSVP Filter Tabs */}
        <div className="bg-surface-container p-1 rounded-xl inline-flex">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-label font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? "gold-gradient text-white shadow-md"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Error State ─── */}
      {error && (
        <section className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <Icon name="cloud_off" className="text-3xl text-rose-400 mb-2" />
          <p className="text-sm text-rose-700 font-body mb-3">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchGuests();
            }}
            className="cursor-pointer text-sm font-label font-medium text-rose-600 hover:text-rose-800 underline underline-offset-2 transition-colors"
          >
            Try again
          </button>
        </section>
      )}

      {/* ─── Empty State ─── */}
      {!loading && !error && guests.length === 0 && (
        <section className="bg-surface-container-lowest rounded-3xl ambient-shadow ghost-border p-12 text-center">
          <Icon name="group_off" className="text-5xl text-on-surface-variant/30 mb-4" />
          <h3 className="font-headline text-xl text-on-surface mb-2">
            {searchQuery || activeTab !== "All" || familySideFilter
              ? "No guests match your filters"
              : "No guests yet"}
          </h3>
          <p className="text-sm text-on-surface-variant/60 font-body mb-6">
            {searchQuery || activeTab !== "All" || familySideFilter
              ? "Try adjusting your search or filter criteria."
              : "Start building your guest list by adding your first guest."}
          </p>
          {!searchQuery && activeTab === "All" && !familySideFilter && (
            <button
              onClick={handleOpenAdd}
              className="cursor-pointer gold-gradient text-white px-6 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all inline-flex items-center gap-2"
            >
              <Icon name="person_add" className="text-lg" />
              Add Your First Guest
            </button>
          )}
        </section>
      )}

      {/* ─── Desktop Table ─── */}
      <section className="hidden md:block">
        <div className="bg-surface-container-lowest rounded-3xl ambient-shadow ghost-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="text-left text-xs uppercase tracking-widest text-stone-400 font-label font-medium px-6 py-4">
                  Guest Name
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-stone-400 font-label font-medium px-6 py-4">
                  RSVP Status
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-stone-400 font-label font-medium px-6 py-4">
                  Meal Preference
                </th>
                <th className="text-left text-xs uppercase tracking-widest text-stone-400 font-label font-medium px-6 py-4">
                  Family Side
                </th>
                <th className="text-right text-xs uppercase tracking-widest text-stone-400 font-label font-medium px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                guests.map((guest) => (
                  <tr
                    key={guest.id}
                    className="border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-low/50 transition-colors"
                  >
                    {/* Guest Name + Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-label font-semibold">
                            {getInitials(guest.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface">
                            {guest.name}
                            {guest.plusOnes > 0 && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-xs text-primary font-label font-semibold">
                                +{guest.plusOnes}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-on-surface-variant/60">
                            {guest.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{statusPill(guest.rsvpStatus)}</td>

                    {/* Meal */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface-variant font-label">
                        {guest.mealPreference || "Not specified"}
                      </span>
                    </td>

                    {/* Side */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-on-surface-variant font-label">
                        {SIDE_LABELS[guest.familySide]}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {guest.phone && (
                          <button
                            onClick={() => inviteViaWhatsApp(guest)}
                            className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all"
                            title="Invite via WhatsApp"
                          >
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        )}
                        {guest.rsvpToken && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvpToken}`);
                              showToast("RSVP link copied!", "success");
                            }}
                            className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/10 transition-all"
                            title="Copy RSVP Link"
                          >
                            <Icon name="link" className="text-lg" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(guest)}
                          className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-container/10 transition-all"
                          title="Edit guest"
                        >
                          <Icon name="edit" className="text-lg" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(guest)}
                          className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all"
                          title="Delete guest"
                        >
                          <Icon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          )}
        </div>
      </section>

      {/* ─── Import CSV Modal ─── */}
      {importOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl ambient-shadow ghost-border w-full sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/15 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-headline text-2xl text-on-surface">Import Guests</h2>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  CSV file · up to 1000 rows per import
                </p>
              </div>
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportResult(null);
                }}
                className="cursor-pointer p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Step 1: download template */}
              <div className="rounded-2xl ghost-border bg-surface-container-low/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name="description" className="text-primary text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-label font-semibold text-on-surface">
                      Download the template
                    </p>
                    <p className="text-xs font-label text-on-surface-variant/70 mt-0.5">
                      Pre-formatted CSV with the columns we accept and a sample row.
                    </p>
                  </div>
                  <button
                    onClick={downloadCsvTemplate}
                    className="shrink-0 cursor-pointer ghost-border bg-surface-container-lowest text-on-surface px-3 py-2 rounded-xl font-label text-xs font-medium hover:border-primary/40 transition-all flex items-center gap-1.5"
                  >
                    <Icon name="download" className="text-sm text-primary" />
                    Template
                  </button>
                </div>
              </div>

              {/* Step 2: column reference */}
              <div className="rounded-2xl ghost-border p-4">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant/70 font-label font-semibold mb-2">
                  Expected columns
                </p>
                <ul className="text-xs font-label text-on-surface-variant space-y-1.5">
                  <li><strong className="text-on-surface">Name</strong> — required</li>
                  <li><strong className="text-on-surface">Email</strong> — optional</li>
                  <li><strong className="text-on-surface">Phone</strong> — optional, international format e.g. <code>+44 7700 900000</code></li>
                  <li><strong className="text-on-surface">Family Side</strong> — BRIDE / GROOM / MUTUAL (defaults to MUTUAL)</li>
                  <li><strong className="text-on-surface">RSVP Status</strong> — ATTENDING / NOT_COMING / NO_RESPONSE</li>
                  <li><strong className="text-on-surface">Meal Preference</strong> — free text (e.g. Halal, Standard)</li>
                  <li><strong className="text-on-surface">Dietary Type</strong> — free text (e.g. Vegetarian)</li>
                  <li><strong className="text-on-surface">Allergies</strong> — free text</li>
                  <li><strong className="text-on-surface">Additional Members</strong> — number, defaults to 0</li>
                  <li><strong className="text-on-surface">Notes</strong> — free text</li>
                </ul>
              </div>

              {/* Step 3: file picker */}
              <div className="rounded-2xl ghost-border bg-surface-container-low/50 p-5">
                <label
                  htmlFor="guest-csv-file"
                  className={`flex flex-col items-center justify-center text-center py-6 px-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    importing
                      ? "border-outline-variant/30 bg-surface-container-low/30"
                      : "border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <Icon name={importing ? "progress_activity" : "upload_file"} className="text-3xl text-primary/60 mb-2" />
                  <p className="text-sm font-label font-medium text-on-surface">
                    {importing ? "Importing..." : "Click to choose a CSV file"}
                  </p>
                  <p className="text-xs font-label text-on-surface-variant/60 mt-1">
                    Or drag a file onto the button above
                  </p>
                </label>
                <input
                  id="guest-csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleImportFile(f);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* Result */}
              {importResult && (
                <div
                  className={`rounded-2xl p-4 ${
                    importResult.imported > 0
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p
                    className={`text-sm font-label font-semibold ${
                      importResult.imported > 0 ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {importResult.imported > 0
                      ? `Imported ${importResult.imported} guest${importResult.imported === 1 ? "" : "s"}`
                      : "No rows imported"}
                    {importResult.skipped > 0 && ` · ${importResult.skipped} skipped`}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="text-xs font-label text-on-surface-variant mt-2 max-h-24 overflow-y-auto space-y-0.5">
                      {importResult.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.error}
                        </li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li className="italic">
                          ...and {importResult.errors.length - 20} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Cards ─── */}
      <section className="md:hidden space-y-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          guests.map((guest) => (
            <div
              key={guest.id}
              className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border"
            >
              {/* Top row: avatar + name + status */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full gold-gradient flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-label font-semibold">
                    {getInitials(guest.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {guest.name}
                    {guest.plusOnes > 0 && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-xs text-primary font-label font-semibold">
                        +{guest.plusOnes}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-on-surface-variant/60 truncate">
                    {guest.email || "No email"}
                  </p>
                </div>
                {statusPill(guest.rsvpStatus)}
              </div>

              {/* Details row */}
              <div className="flex items-center justify-between border-t border-outline-variant/15 pt-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Icon name="restaurant" className="text-sm text-on-surface-variant/50" />
                    <span className="text-xs text-on-surface-variant font-label">
                      {guest.mealPreference || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="favorite" className="text-sm text-on-surface-variant/50" />
                    <span className="text-xs text-on-surface-variant font-label">
                      {SIDE_LABELS[guest.familySide]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {guest.phone && (
                    <button
                      onClick={() => inviteViaWhatsApp(guest)}
                      className="cursor-pointer p-1.5 rounded-lg text-on-surface-variant hover:text-[#25D366] transition-all"
                      title="Invite via WhatsApp"
                    >
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>
                  )}
                  {guest.rsvpToken && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvpToken}`);
                        showToast("RSVP link copied!", "success");
                      }}
                      className="cursor-pointer p-1.5 rounded-lg text-on-surface-variant hover:text-primary transition-all"
                      title="Copy RSVP Link"
                    >
                      <Icon name="link" className="text-lg" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(guest)}
                    className="cursor-pointer p-1.5 rounded-lg text-on-surface-variant hover:text-primary transition-all"
                    title="Edit guest"
                  >
                    <Icon name="edit" className="text-lg" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(guest)}
                    className="cursor-pointer p-1.5 rounded-lg text-on-surface-variant hover:text-error transition-all"
                    title="Delete guest"
                  >
                    <Icon name="delete" className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
