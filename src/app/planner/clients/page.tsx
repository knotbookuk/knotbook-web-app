"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface ClientWedding {
  id: string;
  clientName: string;
  partnerName1: string;
  partnerName2: string;
  weddingDate: string | null;
  culturalStyle: string;
  totalBudget: number;
  spent: number;
  estimated: number;
  guestCount: number;
  taskCount: number;
  eventCount: number;
  vendorCount: number;
  createdAt: string;
}

type CulturalStyleValue = "CLASSIC_BRITISH" | "CLASSIC_ASIAN" | "ARAB";

interface FormState {
  partnerName1: string;
  partnerName2: string;
  clientName: string;
  weddingDate: string;
  culturalStyle: CulturalStyleValue;
  totalBudget: string;
}

const EMPTY_FORM: FormState = {
  partnerName1: "",
  partnerName2: "",
  clientName: "",
  weddingDate: "",
  culturalStyle: "CLASSIC_ASIAN",
  totalBudget: "",
};

const CULTURAL_OPTIONS: {
  value: CulturalStyleValue;
  label: string;
  icon: string;
}[] = [
  { value: "CLASSIC_BRITISH", label: "Classic British", icon: "church" },
  { value: "CLASSIC_ASIAN", label: "Classic Asian", icon: "temple_buddhist" },
  { value: "ARAB", label: "Arab", icon: "mosque" },
];

const STYLE_LABELS: Record<string, string> = {
  CLASSIC_BRITISH: "Classic British",
  CLASSIC_ASIAN: "Classic Asian",
  ARAB: "Arab",
};

/* ─── Helpers ─── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatus(weddingDate: string | null): {
  label: string;
  cls: string;
} {
  if (!weddingDate) {
    return { label: "Planning", cls: "bg-amber-100 text-amber-800" };
  }
  const now = new Date();
  const date = new Date(weddingDate);
  if (date < now) {
    return { label: "Completed", cls: "bg-green-100 text-green-800" };
  }
  const diffMs = date.getTime() - now.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
  if (diffMonths <= 3) {
    return { label: "Finalizing", cls: "bg-blue-100 text-blue-800" };
  }
  return { label: "Planning", cls: "bg-amber-100 text-amber-800" };
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center px-6">
        <div className="w-48 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-2xl ghost-border h-64 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Add / Edit Modal ─── */

function ClientFormModal({
  editing,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  editing: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const isValid = form.partnerName1.trim() && form.partnerName2.trim();

  // Auto-populate client name when partner names change (only if client name is empty or matches previous auto-generated value)
  const autoName = `${form.partnerName1.trim()} & ${form.partnerName2.trim()}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-lg w-full ambient-shadow max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
            <Icon name={editing ? "edit" : "person_add"} className="text-white text-xl" />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              {editing ? "Edit Client" : "Add Client"}
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              {editing
                ? "Update client wedding details"
                : "Create a new client wedding"}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          {/* Partner Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-label text-on-surface-variant mb-1 block">
                Partner 1 Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.partnerName1}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    partnerName1: e.target.value,
                    // Auto-update client name if it matches the old auto-generated name or is empty
                    clientName:
                      prev.clientName === "" ||
                      prev.clientName ===
                        `${prev.partnerName1.trim()} & ${prev.partnerName2.trim()}`
                        ? ""
                        : prev.clientName,
                  }))
                }
                placeholder="e.g. Sarah"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-label text-on-surface-variant mb-1 block">
                Partner 2 Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.partnerName2}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    partnerName2: e.target.value,
                    clientName:
                      prev.clientName === "" ||
                      prev.clientName ===
                        `${prev.partnerName1.trim()} & ${prev.partnerName2.trim()}`
                        ? ""
                        : prev.clientName,
                  }))
                }
                placeholder="e.g. James"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="text-xs font-label text-on-surface-variant mb-1 block">
              Client Name
            </label>
            <input
              type="text"
              value={form.clientName || autoName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, clientName: e.target.value }))
              }
              placeholder="Auto-generated from partner names"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <p className="text-[11px] font-label text-on-surface-variant/60 mt-1">
              Auto-populated as &ldquo;Partner 1 &amp; Partner 2&rdquo; &mdash;
              edit to customise
            </p>
          </div>

          {/* Wedding Date */}
          <div>
            <label className="text-xs font-label text-on-surface-variant mb-1 block">
              Wedding Date
            </label>
            <input
              type="date"
              value={form.weddingDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, weddingDate: e.target.value }))
              }
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Cultural Style */}
          <div>
            <label className="text-xs font-label text-on-surface-variant mb-2 block">
              Cultural Style
            </label>
            <div className="flex flex-wrap gap-3">
              {CULTURAL_OPTIONS.map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="culturalStyle"
                    value={option.value}
                    className="peer sr-only"
                    checked={form.culturalStyle === option.value}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        culturalStyle: option.value,
                      }))
                    }
                  />
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300
                      ghost-border bg-background
                      hover:border-primary-container hover:shadow-sm
                      peer-checked:bg-primary/10 peer-checked:border-primary
                      peer-checked:ring-1 peer-checked:ring-primary/20"
                  >
                    <Icon name={option.icon} className="text-lg text-primary" />
                    <span className="text-sm font-label text-on-surface">
                      {option.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs font-label text-on-surface-variant mb-1 block">
              Estimated Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-sm font-medium">
                &pound;
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={
                  form.totalBudget
                    ? Number(form.totalBudget).toLocaleString("en-GB")
                    : ""
                }
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    totalBudget: e.target.value
                      .replace(/,/g, "")
                      .replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="e.g. 25,000"
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end mt-6 pt-4 border-t border-outline-variant/10">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !isValid}
            className="px-5 py-2 rounded-full gold-gradient text-on-primary text-sm font-label font-medium hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteConfirmModal({
  clientName,
  onConfirm,
  onCancel,
  deleting,
}: {
  clientName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-md w-full ambient-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Icon name="warning" className="text-red-600" />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              Delete Client Wedding
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-sm font-label text-on-surface-variant mb-4">
          All associated data for <strong>{clientName}</strong> (guests, budget,
          vendors, tasks, etc.) will be permanently deleted. Type{" "}
          <strong>DELETE</strong> to confirm.
        </p>

        <input
          type="text"
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all mb-5"
        />

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting || confirmText !== "DELETE"}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-label font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─── */

export default function PlannerClientsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<ClientWedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ClientWedding | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Switching state
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Redirect non-planners
  useEffect(() => {
    if (status === "authenticated" && session?.user?.userType !== "PLANNER") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch clients
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.userType !== "PLANNER")
      return;

    async function fetchClients() {
      try {
        const res = await fetch("/api/planner/clients");
        if (!res.ok) {
          throw new Error(`Failed to fetch clients (${res.status})`);
        }
        const json = await res.json();
        setClients(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [status, session]);

  // Open add modal
  function handleAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowFormModal(true);
  }

  // Open edit modal
  function handleEdit(client: ClientWedding) {
    setEditingId(client.id);
    setForm({
      partnerName1: client.partnerName1,
      partnerName2: client.partnerName2,
      clientName: client.clientName,
      weddingDate: client.weddingDate
        ? new Date(client.weddingDate).toISOString().split("T")[0]
        : "",
      culturalStyle: (client.culturalStyle as CulturalStyleValue) || "CLASSIC_ASIAN",
      totalBudget: client.totalBudget ? String(client.totalBudget) : "",
    });
    setShowFormModal(true);
  }

  // Save (add or edit)
  async function handleSave() {
    setSaving(true);
    try {
      const autoName = `${form.partnerName1.trim()} & ${form.partnerName2.trim()}`;
      const body = {
        partnerName1: form.partnerName1.trim(),
        partnerName2: form.partnerName2.trim(),
        clientName: form.clientName.trim() || autoName,
        weddingDate: form.weddingDate || null,
        culturalStyle: form.culturalStyle,
        totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : 0,
      };

      const url = editingId
        ? `/api/planner/clients/${editingId}`
        : "/api/planner/clients";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save client");
      }

      // Refresh client list
      const listRes = await fetch("/api/planner/clients");
      if (listRes.ok) {
        setClients(await listRes.json());
      }

      setShowFormModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/planner/clients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete client");
      }

      const result = await res.json();

      // Remove from local state
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);

      // If deleted wedding was the active one, clear the session
      if (result.wasActive) {
        await update();
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // Manage Wedding (switch active)
  async function handleManageWedding(weddingId: string) {
    setSwitchingId(weddingId);
    try {
      const res = await fetch("/api/planner/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to switch wedding");
      }
      await update();
      window.location.href = "/dashboard";
    } catch (err) {
      alert((err as Error).message);
      setSwitchingId(null);
    }
  }

  // Loading
  if (status === "loading" || loading) {
    return <LoadingSkeleton />;
  }

  // Guard
  if (!session || session.user.userType !== "PLANNER") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">
            Failed to load clients
          </h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">
          Client Management
        </h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full gold-gradient text-on-primary text-sm font-label font-medium hover:opacity-90 transition-all cursor-pointer"
        >
          <Icon name="person_add" className="text-lg" />
          Add Client
        </button>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1200px] mx-auto">
          {clients.length === 0 ? (
            /* ─── Empty State ─── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Icon name="group_add" className="text-primary text-4xl" />
              </div>
              <h2 className="font-headline text-2xl text-on-surface mb-2">
                No clients yet
              </h2>
              <p className="text-sm font-label text-on-surface-variant mb-6 max-w-sm">
                Start managing weddings for your clients by adding your first
                client.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full gold-gradient text-on-primary text-sm font-label font-medium hover:opacity-90 transition-all cursor-pointer"
              >
                <Icon name="person_add" className="text-lg" />
                Add your first client
              </button>
            </div>
          ) : (
            /* ─── Client Cards Grid ─── */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => {
                const status = getStatus(client.weddingDate);
                const dateDisplay = formatDate(client.weddingDate);

                return (
                  <div
                    key={client.id}
                    className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden flex flex-col"
                  >
                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Name + Status */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-headline text-lg text-on-surface leading-tight">
                          {client.clientName}
                        </h3>
                        <span
                          className={`text-xs font-label font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Partner Names */}
                      <p className="text-sm font-label text-on-surface-variant mb-2">
                        {client.partnerName1} &amp; {client.partnerName2}
                      </p>

                      {/* Wedding Date */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Icon name="calendar_month" className="text-on-surface-variant/60 text-base" />
                        <span className="text-sm font-label text-on-surface-variant">
                          {dateDisplay || "Date not set"}
                        </span>
                      </div>

                      {/* Cultural Style Badge */}
                      <div className="mb-4">
                        <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary-container/20 text-primary">
                          {STYLE_LABELS[client.culturalStyle] ||
                            client.culturalStyle.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1">
                          <Icon name="group" className="text-on-surface-variant/60 text-base" />
                          <span className="text-xs font-label text-on-surface-variant">
                            {client.guestCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="assignment" className="text-on-surface-variant/60 text-base" />
                          <span className="text-xs font-label text-on-surface-variant">
                            {client.taskCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="storefront" className="text-on-surface-variant/60 text-base" />
                          <span className="text-xs font-label text-on-surface-variant">
                            {client.vendorCount}
                          </span>
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="mt-auto">
                        <p className="text-sm font-label text-on-surface">
                          {formatCurrency(client.spent)}{" "}
                          <span className="text-on-surface-variant">
                            spent of {formatCurrency(client.totalBudget)}
                          </span>
                        </p>
                        {client.totalBudget > 0 && (
                          <div className="mt-1.5 h-1.5 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className="h-full rounded-full gold-gradient transition-all"
                              style={{
                                width: `${Math.min(100, (Number(client.spent) / Number(client.totalBudget)) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="px-5 py-3 border-t border-outline-variant/10 flex items-center gap-2">
                      <button
                        onClick={() => handleManageWedding(client.id)}
                        disabled={switchingId === client.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {switchingId === client.id ? (
                          <>
                            <Icon name="progress_activity" className="text-sm animate-spin" />
                            Switching...
                          </>
                        ) : (
                          <>
                            <Icon name="open_in_new" className="text-sm" />
                            Manage Wedding
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="px-3 py-2 rounded-xl ghost-border text-xs font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(client)}
                        className="px-3 py-2 rounded-xl text-xs font-label font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showFormModal && (
        <ClientFormModal
          editing={!!editingId}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={() => {
            setShowFormModal(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }}
          saving={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          clientName={deleteTarget.clientName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
