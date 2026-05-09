"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: { plan: string; status: string } | null;
  weddings: {
    id: string;
    partnerName1: string;
    partnerName2: string;
    weddingDate: string | null;
  }[];
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  revenue: number;
  subscriptions: { monthly: number; lifetime: number };
}

interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

type FilterType = "all" | "with_sub" | "without_sub";

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
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

function planLabel(plan: string): string {
  switch (plan) {
    case "COUPLE_MONTHLY":
      return "Personal · Monthly";
    case "COUPLE_YEARLY":
      return "Personal · Yearly";
    case "PLANNER_BASIC_MONTHLY":
      return "Planner Basic · Monthly";
    case "PLANNER_BASIC_YEARLY":
      return "Planner Basic · Yearly";
    case "PLANNER_ADVANCED_MONTHLY":
      return "Planner Advanced · Monthly";
    case "PLANNER_ADVANCED_YEARLY":
      return "Planner Advanced · Yearly";
    case "MONTHLY":
      return "Legacy Monthly";
    case "LIFETIME":
      return "Lifetime";
    default:
      return plan;
  }
}

function planBadge(user: AdminUser) {
  if (!user.subscription) {
    return (
      <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
        Free
      </span>
    );
  }
  const plan = user.subscription.plan;
  const isPremium =
    plan === "LIFETIME" ||
    plan === "PLANNER_ADVANCED_MONTHLY" ||
    plan === "PLANNER_ADVANCED_YEARLY";
  return (
    <span
      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
        isPremium
          ? "bg-primary-container/20 text-primary"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {planLabel(plan)}
    </span>
  );
}

function statusBadge(user: AdminUser) {
  if (!user.subscription) {
    return (
      <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
        No Sub
      </span>
    );
  }
  const statusMap: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    PAST_DUE: "bg-amber-100 text-amber-800",
    TRIALING: "bg-blue-100 text-blue-800",
  };
  const cls =
    statusMap[user.subscription.status] ??
    "bg-surface-container text-on-surface-variant";
  return (
    <span
      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${cls}`}
    >
      {user.subscription.status.charAt(0) +
        user.subscription.status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-32 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="w-40 h-6 bg-surface-container rounded animate-pulse" />
            <div className="w-72 h-10 bg-surface-container rounded-xl animate-pulse" />
          </div>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-96 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Role Confirmation Modal ─── */

function RoleModal({
  user,
  onConfirm,
  onCancel,
  saving,
}: {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const promoting = user.role !== "ADMIN";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-md w-full ambient-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              promoting ? "bg-primary/10" : "bg-amber-100"
            }`}
          >
            <Icon name={promoting ? "shield_person" : "shield_lock"} className={`${
                promoting ? "text-primary" : "text-amber-700"
              }`} />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              {promoting ? "Grant Admin Access" : "Revoke Admin Access"}
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              {promoting
                ? "User will gain full admin privileges"
                : "User will lose all admin privileges"}
            </p>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-3 mb-5">
          <p className="text-sm font-label font-medium text-on-surface">
            {user.name}
          </p>
          <p className="text-xs font-label text-on-surface-variant">
            {user.email}
          </p>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-white text-sm font-label font-medium transition-colors disabled:opacity-50 cursor-pointer ${
              promoting
                ? "bg-primary hover:bg-primary/90"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {saving
              ? "Saving..."
              : promoting
                ? "Grant Admin"
                : "Revoke Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteModal({
  user,
  onConfirm,
  onCancel,
  deleting,
}: {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-md w-full ambient-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Icon name="warning" className="text-red-600" />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              Delete User
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className="text-sm font-label text-on-surface-variant mb-1">
          Are you sure you want to delete this user?
        </p>
        <div className="bg-surface-container rounded-xl p-3 mb-5">
          <p className="text-sm font-label font-medium text-on-surface">
            {user.name}
          </p>
          <p className="text-xs font-label text-on-surface-variant">
            {user.email}
          </p>
        </div>
        <p className="text-xs font-label text-red-600 mb-5">
          All associated data (wedding, guests, budget, vendors, tasks, etc.)
          will be permanently deleted.
        </p>

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
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-label font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Row Actions Trigger (kebab button) ─── */

function RowActionsTrigger({
  user,
  isOpen,
  onOpen,
}: {
  user: AdminUser;
  isOpen: boolean;
  onOpen: (anchor: HTMLButtonElement) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (ref.current) onOpen(ref.current);
      }}
      aria-label={`Actions for ${user.name}`}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      data-row-actions-trigger
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer"
    >
      <Icon name="more_vert" className="text-[20px]" />
    </button>
  );
}

/* ─── Single Floating Actions Menu (rendered once at page root) ─── */

function FloatingActionsMenu({
  user,
  anchor,
  onClose,
  onView,
  onToggleRole,
  onDelete,
  showRoleToggle,
}: {
  user: AdminUser;
  anchor: HTMLButtonElement;
  onClose: () => void;
  onView: () => void;
  onToggleRole: () => void;
  onDelete: () => void;
  showRoleToggle: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Compute position from anchor; flip up if near bottom
  useEffect(() => {
    function compute() {
      const rect = anchor.getBoundingClientRect();
      const menuWidth = 200;
      const estimatedHeight = showRoleToggle ? 168 : 120;
      const margin = 6;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp =
        spaceBelow < estimatedHeight + margin + 8 &&
        rect.top > estimatedHeight + margin;
      const top = openUp
        ? rect.top - margin - estimatedHeight
        : rect.bottom + margin;
      const left = Math.max(
        8,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
      );
      setPos({ top, left });
    }
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [anchor, showRoleToggle]);

  // Click-outside + Escape
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchor.contains(target)) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        anchor.focus();
      }
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchor, onClose]);

  if (!pos) return null;

  const isPromote = user.role !== "ADMIN";

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${user.name}`}
      className="fixed z-[1000] w-[200px] py-1.5 bg-surface-container-lowest rounded-xl ghost-border shadow-[0_10px_40px_-8px_rgba(28,28,24,0.18)]"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        role="menuitem"
        type="button"
        onClick={() => {
          onView();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-label text-on-surface hover:bg-primary-container/15 focus:outline-none focus:bg-primary-container/15 transition-colors cursor-pointer"
      >
        <Icon name="visibility" className="text-[18px] text-on-surface-variant" />
        View details
      </button>

      {showRoleToggle && (
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            onToggleRole();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-label text-on-surface hover:bg-primary-container/15 focus:outline-none focus:bg-primary-container/15 transition-colors cursor-pointer"
        >
          <Icon name={isPromote ? "shield_person" : "remove_moderator"} className="text-[18px] text-on-surface-variant" />
          {isPromote ? "Make admin" : "Revoke admin"}
        </button>
      )}

      <div className="my-1 border-t border-outline-variant/20" />

      <button
        role="menuitem"
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-label text-error hover:bg-error/10 focus:outline-none focus:bg-error/10 transition-colors cursor-pointer"
      >
        <Icon name="delete" className="text-[18px]" />
        Delete user
      </button>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Stats from /api/admin (kept separate from the paginated user list)
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Paginated users from /api/admin/users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const [menuTarget, setMenuTarget] = useState<{ user: AdminUser; anchor: HTMLButtonElement } | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch admin stats once (totalUsers, activeSubscriptions, revenue, etc.)
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) {
          throw new Error(`Failed to fetch admin stats (${res.status})`);
        }
        const json = await res.json();
        if (cancelled) return;
        setStats({
          totalUsers: json.totalUsers,
          activeSubscriptions: json.activeSubscriptions,
          revenue: json.revenue,
          subscriptions: json.subscriptions,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session]);

  // Fetch paginated users
  const fetchUsers = useCallback(async () => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("paginate", "true");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "all") params.set("filter", filter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `Failed to fetch users (${res.status})`);
      }
      const data: PaginatedUsers = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUsersLoading(false);
    }
  }, [status, session, page, pageSize, search, filter]);

  // Reset to page 1 whenever filters/search change.
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  // Single fetch effect — debounced for search, immediate for other changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setUsersLoading(true);
      fetchUsers();
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, search]);

  // Toggle admin role handler
  async function handleToggleRole() {
    if (!roleTarget) return;
    const newRole = roleTarget.role === "ADMIN" ? "USER" : "ADMIN";
    setSavingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${roleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update role");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === roleTarget.id ? { ...u, role: newRole } : u
        )
      );
      setRoleTarget(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingRole(false);
    }
  }

  // Delete user handler
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete user");
      }
      // Remove from local state and decrement totals
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      if (stats) {
        setStats({ ...stats, totalUsers: Math.max(0, stats.totalUsers - 1) });
      }
      setDeleteTarget(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // Show loading state on initial load (both stats + users not yet returned)
  if (status === "loading" || (statsLoading && usersLoading && !stats && users.length === 0)) {
    return <LoadingSkeleton />;
  }

  // Guard against non-admin
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Error state
  if (error && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">
            Failed to load users
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

  const totalUsers = stats?.totalUsers ?? total;

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Users</h1>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header + Search + Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-lg text-on-surface">
                All Users
              </h2>
              <p className="text-xs font-label text-on-surface-variant mt-0.5">
                {totalUsers} total user{totalUsers !== 1 ? "s" : ""}
                {(search || filter !== "all") &&
                  ` (${total} match${total !== 1 ? "" : "es"})`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Filter dropdown */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Users</option>
                <option value="with_sub">With Subscription</option>
                <option value="without_sub">Without Subscription</option>
              </select>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Users — mobile cards (below md) */}
          <div className="md:hidden">
            {usersLoading ? (
              <div className="bg-surface-container-lowest rounded-2xl ghost-border p-8 text-center text-sm font-label text-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin text-base align-middle mr-2" />
                Loading...
              </div>
            ) : users.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl ghost-border p-8 text-center text-sm font-label text-on-surface-variant">
                {search || filter !== "all"
                  ? "No users match your search/filter."
                  : "No users found."}
              </div>
            ) : (
              <ul className="space-y-3">
                {users.map((user) => (
                  <li
                    key={user.id}
                    onClick={(e) => {
                      // Avoid navigating when clicking inside the kebab menu
                      const target = e.target as HTMLElement;
                      if (target.closest("[data-row-actions]")) return;
                      router.push(`/admin/users/${user.id}`);
                    }}
                    className="bg-surface-container-lowest rounded-2xl ghost-border p-4 cursor-pointer hover:bg-surface-container-low/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-label font-semibold text-primary">
                          {initials(user.name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-label font-medium text-on-surface truncate">
                          {user.name}
                        </p>
                        <p className="text-xs font-label text-on-surface-variant truncate">
                          {user.email}
                        </p>
                      </div>
                      <div data-row-actions className="shrink-0 -mr-1.5 -mt-1.5">
                        <RowActionsTrigger
                          user={user}
                          isOpen={menuTarget?.user.id === user.id}
                          onOpen={(anchor) => setMenuTarget({ user, anchor })}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {planBadge(user)}
                      {user.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          <Icon name="shield_person" className="text-sm" />
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                          User
                        </span>
                      )}
                      {statusBadge(user)}
                    </div>

                    <p className="mt-3 text-xs font-label text-on-surface-variant">
                      Signed up {formatDate(user.createdAt)} ·{" "}
                      Wedding{" "}
                      {user.weddings && user.weddings.length > 0
                        ? "created"
                        : "none"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {!usersLoading && users.length > 0 && (
              <div className="mt-3 bg-surface-container-lowest rounded-2xl ghost-border">
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
              </div>
            )}
          </div>

          {/* Users Table — desktop (md+) */}
          <div className="hidden md:block bg-surface-container-lowest rounded-2xl ghost-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Signup Date
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Wedding
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-sm font-label text-on-surface-variant"
                      >
                        <Icon name="progress_activity" className="animate-spin text-base align-middle mr-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    users.map((user, i) => (
                      <tr
                        key={user.id}
                        className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                          i === users.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-label font-semibold text-primary">
                                {initials(user.name)}
                              </span>
                            </div>
                            <span className="text-sm font-label font-medium text-on-surface">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm font-label text-on-surface-variant">
                          {user.email}
                        </td>
                        <td className="px-6 py-3.5">{planBadge(user)}</td>
                        <td className="px-6 py-3.5">
                          {user.role === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                              <Icon name="shield_person" className="text-sm" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">{statusBadge(user)}</td>
                        <td className="px-6 py-3.5 text-sm font-label text-on-surface-variant">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-3.5">
                          {user.weddings && user.weddings.length > 0 ? (
                            <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                              Created
                            </span>
                          ) : (
                            <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <RowActionsTrigger
                            user={user}
                            isOpen={menuTarget?.user.id === user.id}
                            onOpen={(anchor) => setMenuTarget({ user, anchor })}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                  {!usersLoading && users.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-sm font-label text-on-surface-variant"
                      >
                        {search || filter !== "all"
                          ? "No users match your search/filter."
                          : "No users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!usersLoading && (
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Role Confirmation Modal */}
      {roleTarget && (
        <RoleModal
          user={roleTarget}
          onConfirm={handleToggleRole}
          onCancel={() => setRoleTarget(null)}
          saving={savingRole}
        />
      )}

      {/* Floating Row Actions Menu (single instance) */}
      {menuTarget && (
        <FloatingActionsMenu
          user={menuTarget.user}
          anchor={menuTarget.anchor}
          onClose={() => setMenuTarget(null)}
          onView={() => router.push(`/admin/users/${menuTarget.user.id}`)}
          onToggleRole={() => setRoleTarget(menuTarget.user)}
          onDelete={() => setDeleteTarget(menuTarget.user)}
          showRoleToggle={menuTarget.user.id !== session.user.id}
        />
      )}
    </div>
  );
}
