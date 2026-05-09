"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface VendorPayment {
  id: string;
  amount: string;
  description: string | null;
  dueDate: string;
  paidDate: string | null;
  status: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    billingHistory: {
      id: string;
      amount: string;
      currency: string;
      description: string;
      paidAt: string;
    }[];
  } | null;
  weddings: {
    id: string;
    culturalStyle: string;
    weddingDate: string | null;
    partnerName1: string;
    partnerName2: string;
    totalBudget: string;
    venue: string | null;
    notes: string | null;
    guests: {
      id: string;
      name: string;
      email: string | null;
      familySide: string;
      rsvpStatus: string;
      mealPreference: string | null;
    }[];
    budgetItems: {
      id: string;
      category: string;
      description: string | null;
      estimatedCost: string;
      actualCost: string;
      paidAmount: string;
      status: string;
    }[];
    events: {
      id: string;
      name: string;
      description: string | null;
      date: string;
      startTime: string | null;
      endTime: string | null;
      venue: string | null;
    }[];
    tasks: {
      id: string;
      title: string;
      description: string | null;
      assigneeName: string | null;
      dueDate: string | null;
      priority: string;
      status: string;
    }[];
    checklistItems: {
      id: string;
      title: string;
      category: string | null;
      isCompleted: boolean;
    }[];
    vendors: {
      id: string;
      name: string;
      category: string;
      status: string;
      quoteAmount: string | null;
      payments: VendorPayment[];
    }[];
    seatingTables: {
      id: string;
      name: string;
      capacity: number;
      guests: { id: string; name: string }[];
    }[];
    outfits: {
      id: string;
      name: string;
      type: string;
      cost: string | null;
      status: string;
    }[];
    moodBoardItems: {
      id: string;
      title: string;
      category: string | null;
    }[];
  }[];
}

/* ─── Helpers ─── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleBadge(role: string) {
  return role === "ADMIN" ? (
    <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary-container/20 text-primary">
      Admin
    </span>
  ) : (
    <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
      User
    </span>
  );
}

function planBadge(sub: UserDetail["subscription"]) {
  if (!sub) {
    return (
      <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
        Free
      </span>
    );
  }
  const isLifetime = sub.plan === "LIFETIME";
  return (
    <span
      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
        isLifetime
          ? "bg-primary-container/20 text-primary"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {isLifetime ? "Lifetime" : "Monthly"}
    </span>
  );
}

function taskStatusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    TODO: "bg-surface-container text-on-surface-variant",
  };
  const cls = map[status] ?? "bg-surface-container text-on-surface-variant";
  const label = status.replace("_", " ").charAt(0) + status.replace("_", " ").slice(1).toLowerCase();
  return (
    <span className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function rsvpBadge(status: string) {
  const map: Record<string, string> = {
    ATTENDING: "bg-green-100 text-green-800",
    NOT_COMING: "bg-red-100 text-red-800",
    NO_RESPONSE: "bg-surface-container text-on-surface-variant",
  };
  const cls = map[status] ?? "bg-surface-container text-on-surface-variant";
  const label = status.replace("_", " ").charAt(0) + status.replace("_", " ").slice(1).toLowerCase();
  return (
    <span className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function budgetStatusBadge(status: string) {
  const map: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    PARTIALLY_PAID: "bg-blue-100 text-blue-800",
    DUE: "bg-amber-100 text-amber-800",
    OVERDUE: "bg-red-100 text-red-800",
  };
  const cls = map[status] ?? "bg-surface-container text-on-surface-variant";
  const label = status.replace("_", " ").charAt(0) + status.replace("_", " ").slice(1).toLowerCase();
  return (
    <span className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-48 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-48 animate-pulse" />
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-64 animate-pulse" />
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-48 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Collapsible Section ─── */

function Section({
  title,
  icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden group"
      open={defaultOpen}
    >
      <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-surface-container-low/50 transition-colors select-none list-none">
        <Icon name={icon} className="text-primary/60 text-xl" />
        <span className="font-headline text-base text-on-surface flex-1">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
            {count}
          </span>
        )}
        <Icon name="expand_more" className="text-on-surface-variant text-lg transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-6 pb-5 border-t border-outline-variant/10">
        {children}
      </div>
    </details>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteConfirmModal({
  userName,
  onConfirm,
  onCancel,
  deleting,
}: {
  userName: string;
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
              Delete User Permanently
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-sm font-label text-on-surface-variant mb-4">
          All associated data (wedding, guests, budget, vendors, tasks, etc.)
          will be permanently deleted. Type <strong>DELETE</strong> to confirm.
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
            {deleting ? "Deleting..." : `Delete ${userName}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Load Test Data Confirmation Modal ─── */
/*
 * Confirmation pattern: "Type LOAD DATA to confirm" — matches the existing
 * delete-account UX in dashboard/settings (and the delete-user modal above)
 * so testers don't have to learn a second pattern.
 */

function LoadTestDataModal({
  userName,
  onConfirm,
  onCancel,
  loading,
}: {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-lg w-full ambient-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Icon name="science" className="text-amber-700" />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              Load Test Data for {userName}
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              This action is destructive and cannot be undone
            </p>
          </div>
        </div>

        <div className="text-sm font-label text-on-surface-variant mb-4 space-y-2">
          <p>This will:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-red-600">Delete</strong> this user&apos;s
              existing wedding and ALL associated data — events, guests, budget
              items, vendors, vendor payments, seating, outfits, tasks,
              checklists, mood board, beauty pros, menu, and notes.
            </li>
            <li>
              <strong className="text-on-surface">Preserve</strong> the
              user&apos;s account, subscription, notification preferences, name,
              and email.
            </li>
            <li>Replace everything with a fresh three-day Asian wedding worth of dummy data, including reminder-triggering tasks and vendor payments.</li>
          </ul>
          <p className="text-xs italic pt-1">
            Note: if this user is a planner, the dummy data will appear as a
            client wedding in their planner sidebar.
          </p>
          <p className="pt-2">
            Type <strong className="font-mono text-amber-700">LOAD DATA</strong> to confirm.
          </p>
        </div>

        <input
          type="text"
          placeholder='Type "LOAD DATA" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all mb-5"
        />

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || confirmText !== "LOAD DATA"}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-label font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Loading..." : "Load test data"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load Test Data state
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedToast, setSeedToast] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch user detail
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || `Failed to fetch user (${res.status})`);
        }
        const json = await res.json();
        setUser(json);
        setEditName(json.name);
        setEditEmail(json.email);
        setEditRole(json.role);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [status, session, id]);

  // Save user edits
  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save changes");
      }
      const updated = await res.json();
      setUser((prev) => (prev ? { ...prev, name: updated.name, email: updated.email, role: updated.role } : prev));
      setSaveMessage("Changes saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  // Delete user
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete user");
      }
      router.push("/admin/users");
    } catch (err) {
      alert((err as Error).message);
      setDeleting(false);
    }
  }

  // Load test data
  async function handleLoadTestData() {
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/seed`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load test data");
      }
      const s = json.summary as {
        weddings: number;
        events: number;
        guests: number;
        budgetItems: number;
        vendors: number;
        payments: number;
        outfits: number;
        tasks: number;
        checklists: number;
        moodBoardItems: number;
      };
      setSeedToast(
        `Loaded ${s.weddings} wedding, ${s.events} events, ${s.guests} guests, ${s.budgetItems} budget items, ${s.vendors} vendors, ${s.payments} payments, ${s.outfits} outfits, ${s.tasks} tasks, ${s.moodBoardItems} inspirations.`,
      );
      setShowSeedModal(false);
      // Refresh the page so the new wedding shows up.
      router.refresh();
      const refetch = await fetch(`/api/admin/users/${id}`);
      if (refetch.ok) {
        const updated = await refetch.json();
        setUser(updated);
      }
      setTimeout(() => setSeedToast(null), 8000);
    } catch (err) {
      setSeedToast(`Error: ${(err as Error).message}`);
      setTimeout(() => setSeedToast(null), 6000);
    } finally {
      setSeeding(false);
    }
  }

  // Show loading state
  if (status === "loading" || loading) {
    return <LoadingSkeleton />;
  }

  // Guard against non-admin
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">
            Failed to load user
          </h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">
            {error}
          </p>
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer inline-block"
          >
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const wedding = user.weddings?.[0] ?? null;

  // Stats
  const guestCount = wedding?.guests?.length ?? 0;
  const attendingCount = wedding?.guests?.filter((g) => g.rsvpStatus === "ATTENDING").length ?? 0;
  const budgetEstimated = wedding?.budgetItems?.reduce((sum, b) => sum + Number(b.estimatedCost), 0) ?? 0;
  const budgetActual = wedding?.budgetItems?.reduce((sum, b) => sum + Number(b.actualCost), 0) ?? 0;
  const tasksTotal = wedding?.tasks?.length ?? 0;
  const tasksCompleted = wedding?.tasks?.filter((t) => t.status === "COMPLETED").length ?? 0;
  const checklistTotal = wedding?.checklistItems?.length ?? 0;
  const checklistCompleted = wedding?.checklistItems?.filter((c) => c.isCompleted).length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-sm font-label text-on-surface-variant hover:text-primary transition-colors mr-4 cursor-pointer"
        >
          <Icon name="arrow_back" className="text-lg" />
          Users
        </Link>
        <span className="text-outline-variant/30 mr-4">/</span>
        <h1 className="font-headline text-xl text-on-surface truncate">
          {user.name}
        </h1>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1200px] mx-auto space-y-5">
          {/* ─── User Info + Edit Card ─── */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant/10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xl font-label font-semibold text-primary">
                    {initials(user.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-headline text-xl text-on-surface truncate">
                      {user.name}
                    </h2>
                    {roleBadge(user.role)}
                    {planBadge(user.subscription)}
                  </div>
                  <p className="text-sm font-label text-on-surface-variant mt-0.5 truncate">
                    {user.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-label text-on-surface-variant">
                    <span>
                      Signed up: {formatDate(user.createdAt)}
                    </span>
                    <span>
                      Last updated: {formatDate(user.updatedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-label font-medium hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  title="Delete User"
                >
                  <Icon name="delete" className="text-sm" />
                  <span className="hidden sm:inline">Delete User</span>
                </button>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="px-6 py-5">
              <h3 className="font-headline text-sm text-on-surface-variant uppercase tracking-wider mb-4">
                Edit User
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-label text-on-surface-variant mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-label text-on-surface-variant mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-label text-on-surface-variant mb-1 block">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {saveMessage && (
                  <span
                    className={`text-xs font-label ${
                      saveMessage.startsWith("Error")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ─── Stats Summary ─── */}
          {wedding && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-container-lowest rounded-2xl p-4 ghost-border text-center">
                <p className="font-headline text-2xl text-on-surface">
                  {guestCount}
                </p>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  Guests ({attendingCount} attending)
                </p>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 ghost-border text-center">
                <p className="font-headline text-2xl text-on-surface">
                  {formatCurrency(budgetEstimated)}
                </p>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  Budget (est.)
                </p>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 ghost-border text-center">
                <p className="font-headline text-2xl text-on-surface">
                  {tasksTotal > 0
                    ? `${Math.round((tasksCompleted / tasksTotal) * 100)}%`
                    : "N/A"}
                </p>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  Tasks ({tasksCompleted}/{tasksTotal})
                </p>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 ghost-border text-center">
                <p className="font-headline text-2xl text-on-surface">
                  {checklistTotal > 0
                    ? `${Math.round((checklistCompleted / checklistTotal) * 100)}%`
                    : "N/A"}
                </p>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  Checklist ({checklistCompleted}/{checklistTotal})
                </p>
              </div>
            </div>
          )}

          {/* ─── Wedding Details ─── */}
          {wedding ? (
            <Section title="Wedding Details" icon="favorite" defaultOpen>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-xs font-label text-on-surface-variant">
                    Partners
                  </p>
                  <p className="text-sm font-label font-medium text-on-surface">
                    {wedding.partnerName1} & {wedding.partnerName2}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-label text-on-surface-variant">
                    Wedding Date
                  </p>
                  <p className="text-sm font-label font-medium text-on-surface">
                    {formatDate(wedding.weddingDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-label text-on-surface-variant">
                    Cultural Style
                  </p>
                  <p className="text-sm font-label font-medium text-on-surface">
                    {wedding.culturalStyle.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-label text-on-surface-variant">
                    Total Budget
                  </p>
                  <p className="text-sm font-label font-medium text-on-surface">
                    {formatCurrency(wedding.totalBudget)}
                  </p>
                </div>
                {wedding.venue && (
                  <div>
                    <p className="text-xs font-label text-on-surface-variant">
                      Venue
                    </p>
                    <p className="text-sm font-label font-medium text-on-surface">
                      {wedding.venue}
                    </p>
                  </div>
                )}
                {wedding.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-label text-on-surface-variant">
                      Notes
                    </p>
                    <p className="text-sm font-label text-on-surface">
                      {wedding.notes}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border text-center">
              <Icon name="favorite_border" className="text-on-surface-variant/40 text-3xl mb-2" />
              <p className="text-sm font-label text-on-surface-variant">
                This user has not created a wedding yet.
              </p>
            </div>
          )}

          {/* ─── Guest List ─── */}
          {wedding && (
            <Section
              title="Guest List"
              icon="group"
              count={wedding.guests.length}
            >
              {wedding.guests.length > 0 ? (
                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/15">
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Name
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          RSVP
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Family Side
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Meal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wedding.guests.map((guest) => (
                        <tr
                          key={guest.id}
                          className="border-b border-outline-variant/10"
                        >
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                            {guest.name}
                          </td>
                          <td className="pr-4 py-2.5">
                            {rsvpBadge(guest.rsvpStatus)}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant capitalize">
                            {guest.familySide.toLowerCase()}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {guest.mealPreference || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No guests added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Budget Items ─── */}
          {wedding && (
            <Section
              title="Budget Items"
              icon="payments"
              count={wedding.budgetItems.length}
            >
              {wedding.budgetItems.length > 0 ? (
                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/15">
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Category
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Estimated
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Actual
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wedding.budgetItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-outline-variant/10"
                        >
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                            {item.category}
                            {item.description && (
                              <span className="text-on-surface-variant text-xs block">
                                {item.description}
                              </span>
                            )}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {formatCurrency(item.estimatedCost)}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {formatCurrency(item.actualCost)}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {formatCurrency(item.paidAmount)}
                          </td>
                          <td className="pr-4 py-2.5">
                            {budgetStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-outline-variant/20 font-medium">
                        <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                          Total
                        </td>
                        <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                          {formatCurrency(budgetEstimated)}
                        </td>
                        <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                          {formatCurrency(budgetActual)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No budget items added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Events / Timeline ─── */}
          {wedding && (
            <Section
              title="Events / Timeline"
              icon="timeline"
              count={wedding.events.length}
            >
              {wedding.events.length > 0 ? (
                <div className="space-y-3 pt-4">
                  {wedding.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-surface-container/30"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name="event" className="text-primary text-base" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-label font-medium text-on-surface">
                          {event.name}
                        </p>
                        <p className="text-xs font-label text-on-surface-variant">
                          {formatDate(event.date)}
                          {event.startTime && ` at ${event.startTime}`}
                          {event.endTime && ` - ${event.endTime}`}
                        </p>
                        {event.venue && (
                          <p className="text-xs font-label text-on-surface-variant mt-0.5">
                            {event.venue}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs font-label text-on-surface-variant mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No events added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Tasks ─── */}
          {wedding && (
            <Section
              title="Tasks"
              icon="assignment"
              count={wedding.tasks.length}
            >
              {wedding.tasks.length > 0 ? (
                <div className="overflow-x-auto pt-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline-variant/15">
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Task
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Assignee
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Status
                        </th>
                        <th className="pr-4 py-2 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wedding.tasks.map((task) => (
                        <tr
                          key={task.id}
                          className="border-b border-outline-variant/10"
                        >
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface">
                            {task.title}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {task.assigneeName || "Unassigned"}
                          </td>
                          <td className="pr-4 py-2.5">
                            <span
                              className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                                task.priority === "HIGH"
                                  ? "bg-red-100 text-red-800"
                                  : task.priority === "MEDIUM"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="pr-4 py-2.5">
                            {taskStatusBadge(task.status)}
                          </td>
                          <td className="pr-4 py-2.5 text-sm font-label text-on-surface-variant">
                            {formatDate(task.dueDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No tasks added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Checklist Items ─── */}
          {wedding && (
            <Section
              title="Checklist Items"
              icon="checklist"
              count={wedding.checklistItems.length}
            >
              {wedding.checklistItems.length > 0 ? (
                <div className="space-y-2 pt-4">
                  {wedding.checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container/30"
                    >
                      <Icon name={item.isCompleted
                          ? "check_circle"
                          : "radio_button_unchecked"} className={`text-lg ${
                          item.isCompleted
                            ? "text-green-600"
                            : "text-on-surface-variant/40"
                        }`} />
                      <span
                        className={`text-sm font-label ${
                          item.isCompleted
                            ? "text-on-surface-variant line-through"
                            : "text-on-surface"
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.category && (
                        <span className="text-xs font-label px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant ml-auto">
                          {item.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No checklist items added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Vendors ─── */}
          {wedding && (
            <Section
              title="Vendors"
              icon="storefront"
              count={wedding.vendors.length}
            >
              {wedding.vendors.length > 0 ? (
                <div className="space-y-3 pt-4">
                  {wedding.vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="p-3 rounded-xl bg-surface-container/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-label font-medium text-on-surface">
                          {vendor.name}
                        </p>
                        <span
                          className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                            vendor.status === "PAID_IN_FULL"
                              ? "bg-green-100 text-green-800"
                              : vendor.status === "CONFIRMED" ||
                                  vendor.status === "DEPOSIT_PAID"
                                ? "bg-blue-100 text-blue-800"
                                : vendor.status === "CANCELLED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {vendor.status.replace(/_/g, " ").charAt(0) +
                            vendor.status.replace(/_/g, " ").slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs font-label text-on-surface-variant">
                        {vendor.category}
                        {vendor.quoteAmount &&
                          ` - Quote: ${formatCurrency(vendor.quoteAmount)}`}
                      </p>
                      {vendor.payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-outline-variant/10">
                          <p className="text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                            Payments
                          </p>
                          {vendor.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between text-xs font-label text-on-surface-variant py-0.5"
                            >
                              <span>
                                {formatCurrency(payment.amount)}
                                {payment.description &&
                                  ` - ${payment.description}`}
                              </span>
                              <span
                                className={
                                  payment.status === "PAID"
                                    ? "text-green-600"
                                    : payment.status === "OVERDUE"
                                      ? "text-red-600"
                                      : ""
                                }
                              >
                                {payment.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-label text-on-surface-variant pt-4">
                  No vendors added yet.
                </p>
              )}
            </Section>
          )}

          {/* ─── Outfits ─── */}
          {wedding && wedding.outfits.length > 0 && (
            <Section
              title="Outfits"
              icon="checkroom"
              count={wedding.outfits.length}
            >
              <div className="space-y-2 pt-4">
                {wedding.outfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-container/30"
                  >
                    <div>
                      <p className="text-sm font-label font-medium text-on-surface">
                        {outfit.name}
                      </p>
                      <p className="text-xs font-label text-on-surface-variant">
                        {outfit.type.charAt(0) + outfit.type.slice(1).toLowerCase()}
                        {outfit.cost && ` - ${formatCurrency(outfit.cost)}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                        outfit.status === "READY"
                          ? "bg-green-100 text-green-800"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {outfit.status.charAt(0) + outfit.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ─── Seating Tables ─── */}
          {wedding && wedding.seatingTables.length > 0 && (
            <Section
              title="Seating Tables"
              icon="event_seat"
              count={wedding.seatingTables.length}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                {wedding.seatingTables.map((table) => (
                  <div
                    key={table.id}
                    className="p-3 rounded-xl bg-surface-container/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-label font-medium text-on-surface">
                        {table.name}
                      </p>
                      <span className="text-xs font-label text-on-surface-variant">
                        {table.guests.length}/{table.capacity}
                      </span>
                    </div>
                    {table.guests.length > 0 && (
                      <p className="text-xs font-label text-on-surface-variant">
                        {table.guests.map((g) => g.name).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ─── Mood Board Items ─── */}
          {wedding && wedding.moodBoardItems.length > 0 && (
            <Section
              title="Mood Board"
              icon="palette"
              count={wedding.moodBoardItems.length}
            >
              <div className="flex flex-wrap gap-2 pt-4">
                {wedding.moodBoardItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2 rounded-xl bg-surface-container/30"
                  >
                    <p className="text-sm font-label text-on-surface">
                      {item.title}
                    </p>
                    {item.category && (
                      <p className="text-xs font-label text-on-surface-variant">
                        {item.category}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ─── Testing Tools ─── */}
          {/* Visually distinct, below all read-only sections, separated from
              the View / Delete header so testers don't trigger it by accident. */}
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-300/50 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-amber-300/40 flex items-center gap-3">
              <Icon name="science" className="text-amber-700" />
              <div>
                <h3 className="font-headline text-base text-on-surface">
                  Testing tools
                </h3>
                <p className="text-xs font-label text-on-surface-variant">
                  Destructive — for end-to-end testing only
                </p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm font-label text-on-surface-variant mb-4">
                Replace this user&apos;s wedding with a fully-populated test
                wedding. Includes tasks and vendor payments scheduled inside
                the cron windows so reminder emails will fire on the next run.
                Account, subscription, and notification preferences are
                preserved.
              </p>
              <button
                onClick={() => setShowSeedModal(true)}
                disabled={seeding}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-label font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Icon name="bolt" className="text-base" />
                {seeding ? "Loading test data..." : "Load Test Data"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          userName={user.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      {/* Load Test Data Confirmation Modal */}
      {showSeedModal && (
        <LoadTestDataModal
          userName={user.name}
          onConfirm={handleLoadTestData}
          onCancel={() => setShowSeedModal(false)}
          loading={seeding}
        />
      )}

      {/* Seed Result Toast */}
      {seedToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          <div
            className={`rounded-2xl px-4 py-3 ambient-shadow text-sm font-label flex items-start gap-3 ${
              seedToast.startsWith("Error")
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            <Icon name={seedToast.startsWith("Error") ? "error" : "check_circle"} className="text-base mt-0.5" />
            <div className="flex-1">{seedToast}</div>
            <button
              onClick={() => setSeedToast(null)}
              className="text-white/80 hover:text-white cursor-pointer"
              aria-label="Dismiss"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
