"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface SubscriptionItem {
  id: string;
  userId: string;
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  userType: "COUPLE" | "PLANNER";
  subscription: {
    plan: string;
    status: string;
    stripeSubscriptionId: string | null;
  } | null;
}

type ActionType =
  | "cancel_at_period_end"
  | "cancel_immediately"
  | "resume"
  | "refund";

interface PendingAction {
  type: ActionType;
  item: SubscriptionItem;
}

/* ─── Constants ─── */

const PLAN_LABELS: Record<string, string> = {
  COUPLE_MONTHLY: "Personal Monthly",
  COUPLE_YEARLY: "Personal Yearly",
  PLANNER_BASIC_MONTHLY: "Planner Basic Monthly",
  PLANNER_BASIC_YEARLY: "Planner Basic Yearly",
  PLANNER_ADVANCED_MONTHLY: "Planner Advanced Monthly",
  PLANNER_ADVANCED_YEARLY: "Planner Advanced Yearly",
  MONTHLY: "Monthly (Legacy)",
  LIFETIME: "Lifetime (Legacy)",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PAST_DUE: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
  TRIALING: "bg-blue-100 text-blue-800",
};

const STAT_ICONS: Record<string, string> = {
  total: "credit_card",
  ACTIVE: "check_circle",
  PAST_DUE: "schedule",
  CANCELLED: "cancel",
};

const ACTION_CONFIG: Record<
  ActionType,
  { label: string; icon: string; description: string; destructive: boolean }
> = {
  cancel_at_period_end: {
    label: "Cancel at Period End",
    icon: "event_busy",
    description:
      "The subscription will remain active until the current billing period ends, then cancel automatically. The user keeps access until then.",
    destructive: false,
  },
  cancel_immediately: {
    label: "Cancel Immediately",
    icon: "cancel",
    description:
      "The subscription will be cancelled right now on Stripe. The user will lose access immediately. This cannot be undone.",
    destructive: true,
  },
  resume: {
    label: "Resume Subscription",
    icon: "play_arrow",
    description:
      "This will undo the pending cancellation. The subscription will continue to renew normally.",
    destructive: false,
  },
  refund: {
    label: "Refund Last Payment",
    icon: "currency_pound",
    description:
      "A full refund will be issued for the most recent payment on Stripe. This does not cancel the subscription.",
    destructive: true,
  },
};

/* ─── Helpers ─── */

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncateStripeId(id: string | null) {
  if (!id) return "\u2014";
  if (id.length <= 12) return id;
  return id.slice(0, 12) + "\u2026";
}

/* ─── Confirmation Modal ─── */

function ConfirmActionModal({
  action,
  item,
  onConfirm,
  onCancel,
  processing,
}: {
  action: ActionType;
  item: SubscriptionItem;
  onConfirm: () => void;
  onCancel: () => void;
  processing: boolean;
}) {
  const config = ACTION_CONFIG[action];
  const [confirmText, setConfirmText] = useState("");
  const needsTypedConfirmation = config.destructive;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-md w-full ambient-shadow">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              config.destructive ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            <Icon name={config.icon} className={`${
                config.destructive ? "text-red-600" : "text-amber-600"
              }`} />
          </div>
          <div>
            <h3 className="font-headline text-lg text-on-surface">
              {config.label}
            </h3>
            <p className="text-xs font-label text-on-surface-variant">
              {item.user.name} &middot; {item.user.email}
            </p>
          </div>
        </div>

        {/* Plan info */}
        <div className="bg-surface-container rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between text-sm font-label">
            <span className="text-on-surface-variant">Plan</span>
            <span className="font-medium text-on-surface">
              {PLAN_LABELS[item.plan] || item.plan}
            </span>
          </div>
          {item.currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm font-label mt-1.5">
              <span className="text-on-surface-variant">Period ends</span>
              <span className="font-medium text-on-surface">
                {formatDate(item.currentPeriodEnd)}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm font-label text-on-surface-variant mb-4">
          {config.description}
        </p>

        {/* Typed confirmation for destructive actions */}
        {needsTypedConfirmation && (
          <input
            type="text"
            placeholder='Type "CONFIRM" to proceed'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-red-300 transition-all mb-5"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={
              processing ||
              (needsTypedConfirmation && confirmText !== "CONFIRM")
            }
            className={`px-4 py-2 rounded-xl text-sm font-label font-medium transition-colors disabled:opacity-50 cursor-pointer ${
              config.destructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-primary text-on-primary hover:bg-primary/90"
            }`}
          >
            {processing ? "Processing..." : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Grant Subscription Modal ─── */

const GRANT_PLAN_OPTIONS = [
  { value: "COUPLE_MONTHLY", label: "Personal Monthly", forUserType: "COUPLE" },
  { value: "COUPLE_YEARLY", label: "Personal Yearly", forUserType: "COUPLE" },
  { value: "PLANNER_BASIC_MONTHLY", label: "Planner Basic Monthly", forUserType: "PLANNER" },
  { value: "PLANNER_BASIC_YEARLY", label: "Planner Basic Yearly", forUserType: "PLANNER" },
  { value: "PLANNER_ADVANCED_MONTHLY", label: "Planner Advanced Monthly", forUserType: "PLANNER" },
  { value: "PLANNER_ADVANCED_YEARLY", label: "Planner Advanced Yearly", forUserType: "PLANNER" },
] as const;

const DURATION_OPTIONS = [
  { value: "0", label: "No expiry (lifetime comp)" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
];

function GrantSubscriptionModal({
  onClose,
  onGranted,
  pushToast,
}: {
  onClose: () => void;
  onGranted: () => void;
  pushToast: (msg: string, type: "success" | "error") => void;
}) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>("");
  const [durationDays, setDurationDays] = useState<string>("365");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return;
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  // Default plan to first valid option for the user's userType
  useEffect(() => {
    if (!selectedUser) return;
    const validPlans = GRANT_PLAN_OPTIONS.filter(
      (p) => p.forUserType === selectedUser.userType,
    );
    if (validPlans.length > 0 && !validPlans.find((p) => p.value === plan)) {
      setPlan(validPlans[0].value);
    }
  }, [selectedUser, plan]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const blocksGrant = !!selectedUser?.subscription?.stripeSubscriptionId;
  const overwritingComp =
    !!selectedUser?.subscription && !selectedUser.subscription.stripeSubscriptionId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !plan) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          plan,
          durationDays: Number(durationDays) || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grant failed");
      pushToast(
        `Granted ${plan.replace(/_/g, " ")} to ${selectedUser?.name}`,
        "success",
      );
      onGranted();
      onClose();
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const validPlans = selectedUser
    ? GRANT_PLAN_OPTIONS.filter((p) => p.forUserType === selectedUser.userType)
    : [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow w-full sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
              <Icon name="card_giftcard" className="text-white" />
            </div>
            <div>
              <h3 className="font-headline text-lg text-on-surface">
                Grant Free Subscription
              </h3>
              <p className="text-xs font-label text-on-surface-variant">
                No Stripe charge — comp record only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* User search */}
          <div>
            <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
              User *
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-surface-container-low rounded-xl py-2.5 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all mb-2"
            />
            <div className="max-h-48 overflow-y-auto rounded-xl ghost-border bg-surface-container-low/50">
              {loading ? (
                <p className="text-xs font-label text-on-surface-variant/60 p-3">Loading users...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs font-label text-on-surface-variant/60 p-3">
                  No users match.
                </p>
              ) : (
                filteredUsers.slice(0, 50).map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between ${
                      selectedUserId === u.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-label font-medium text-on-surface truncate">
                        {u.name}
                      </p>
                      <p className="text-[11px] font-label text-on-surface-variant truncate">
                        {u.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase">
                        {u.userType}
                      </span>
                      {u.subscription?.stripeSubscriptionId && (
                        <span className="text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Stripe
                        </span>
                      )}
                      {u.subscription && !u.subscription.stripeSubscriptionId && (
                        <span className="text-[10px] font-label font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Comp
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Plan */}
          {selectedUser && (
            <div>
              <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                disabled={blocksGrant}
                className="w-full bg-surface-container-low rounded-xl py-2.5 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {validPlans.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] font-label text-on-surface-variant/60 mt-1">
                Plans filtered to {selectedUser.userType.toLowerCase()} accounts.
              </p>
            </div>
          )}

          {/* Duration */}
          {selectedUser && (
            <div>
              <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
                Duration
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                disabled={blocksGrant}
                className="w-full bg-surface-container-low rounded-xl py-2.5 px-4 ghost-border font-label text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Warnings */}
          {blocksGrant && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <Icon name="error" className="text-red-600 text-base mt-0.5" />
              <div>
                <p className="text-sm font-label font-semibold text-red-800">
                  User has an active Stripe subscription
                </p>
                <p className="text-xs font-label text-red-700 mt-0.5">
                  Cancel it via the Actions menu first to avoid orphaning a paid record.
                </p>
              </div>
            </div>
          )}
          {overwritingComp && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Icon name="info" className="text-amber-600 text-base mt-0.5" />
              <p className="text-xs font-label text-amber-800">
                User already has a comp subscription. Granting will overwrite it with the new plan and duration.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/15 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedUserId || !plan || blocksGrant || submitting}
            className="px-5 py-2 rounded-xl gold-gradient text-white text-sm font-label font-medium shadow hover:shadow-md transition-all disabled:opacity-50 disabled:hover:shadow-none cursor-pointer"
          >
            {submitting ? "Granting..." : "Grant Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ─── */

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg ${
          type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        <Icon name={type === "success" ? "check_circle" : "error"} className="text-lg" />
        <span className="text-sm font-label font-medium">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors cursor-pointer"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </div>
    </div>
  );
}

/* ─── Actions Dropdown ─── */

function ActionsDropdown({
  item,
  onAction,
}: {
  item: SubscriptionItem;
  onAction: (action: ActionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isCancelled = item.status === "CANCELLED";
  const isPendingCancel = item.cancelAtPeriodEnd && !isCancelled;
  const hasStripe = !!item.stripeSubscriptionId;

  // Build available actions based on subscription state
  const actions: { type: ActionType; disabled: boolean; reason?: string }[] =
    [];

  if (!hasStripe) {
    // Comp / admin-granted — render is handled by parent (revoke button)
    return null;
  }

  if (isCancelled) {
    // Already cancelled — only refund available
    actions.push({
      type: "refund",
      disabled: false,
    });
  } else if (isPendingCancel) {
    // Pending cancel — can resume or cancel immediately
    actions.push({ type: "resume", disabled: false });
    actions.push({ type: "cancel_immediately", disabled: false });
    actions.push({ type: "refund", disabled: false });
  } else {
    // Active or trialing — all cancel options + refund
    actions.push({ type: "cancel_at_period_end", disabled: false });
    actions.push({ type: "cancel_immediately", disabled: false });
    actions.push({ type: "refund", disabled: false });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-label font-medium hover:bg-surface-container-high transition-colors cursor-pointer whitespace-nowrap"
      >
        <Icon name="more_vert" className="text-sm" />
        Actions
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-xl ghost-border shadow-lg z-40 overflow-hidden">
          {actions.map((a) => {
            const config = ACTION_CONFIG[a.type];
            return (
              <button
                key={a.type}
                onClick={() => {
                  setOpen(false);
                  onAction(a.type);
                }}
                disabled={a.disabled}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm font-label transition-colors disabled:opacity-40 cursor-pointer ${
                  config.destructive
                    ? "text-red-600 hover:bg-red-50"
                    : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <Icon name={config.icon} className="text-lg" />
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-40 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-2xl ghost-border h-24 animate-pulse"
              />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="w-36 h-10 bg-surface-container rounded-xl animate-pulse" />
            <div className="w-52 h-10 bg-surface-container rounded-xl animate-pulse" />
            <div className="flex-1 h-10 bg-surface-container rounded-xl animate-pulse" />
          </div>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-96 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Server-computed stats (across the whole subscriptions table, not the page)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pastDue: 0,
    cancelled: 0,
  });

  // Action state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Grant / revoke state
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SubscriptionItem | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch subscriptions (server-side pagination + filters)
  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("paginate", "true");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPlan !== "all") params.set("plan", filterPlan);

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch subscriptions (${res.status})`);
      }
      const data: {
        items: SubscriptionItem[];
        total: number;
        page: number;
        pageSize: number;
        stats: typeof stats;
      } = await res.json();
      setItems(data.items);
      setTotal(data.total);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterStatus, filterPlan]);

  // Reset to page 1 whenever filters/search change so we don't land on an
  // empty page.
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterPlan]);

  // Single fetch effect — debounced for search, immediate for other changes
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [status, session, fetchSubscriptions, search]);

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Refresh subscription list (after grant / revoke). Re-runs the current
  // query so filters/search/page are preserved.
  const refetchSubscriptions = useCallback(async () => {
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Revoke comp subscription
  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/grant?id=${revokeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      setToast({ message: "Comp subscription revoked", type: "success" });
      // Re-fetch to keep pagination + stats in sync.
      await refetchSubscriptions();
    } catch (err) {
      setToast({ message: (err as Error).message, type: "error" });
    } finally {
      setProcessing(false);
      setRevokeTarget(null);
    }
  };

  // Execute action
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `/api/admin/subscriptions/${pendingAction.item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: pendingAction.type }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      // Update local state optimistically so the row reflects the change
      // immediately. We then re-fetch in the background to keep the stat
      // cards (server-computed) in sync.
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== pendingAction.item.id) return item;

          switch (pendingAction.type) {
            case "cancel_at_period_end":
              return { ...item, cancelAtPeriodEnd: true };
            case "cancel_immediately":
              return {
                ...item,
                status: "CANCELLED",
                cancelAtPeriodEnd: false,
              };
            case "resume":
              return { ...item, cancelAtPeriodEnd: false };
            case "refund":
              return item; // No status change for refund
            default:
              return item;
          }
        }),
      );

      setToast({ message: data.message, type: "success" });

      // Refresh stats / list from server (don't block UI on this).
      refetchSubscriptions();
    } catch (err) {
      setToast({ message: (err as Error).message, type: "error" });
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  };

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
            Failed to load subscriptions
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

  // Stats / filter values come from the server (`stats` state). The current
  // page list is `items` straight from the API response.
  const totalCount = stats.total;
  const activeCount = stats.active;
  const pastDueCount = stats.pastDue;
  const cancelledCount = stats.cancelled;

  const statCards = [
    {
      key: "total",
      label: "Total Subscribers",
      value: totalCount,
      badgeClass: "bg-surface-container text-on-surface-variant",
    },
    {
      key: "ACTIVE",
      label: "Active",
      value: activeCount,
      badgeClass: "bg-green-100 text-green-800",
    },
    {
      key: "PAST_DUE",
      label: "Past Due",
      value: pastDueCount,
      badgeClass: "bg-amber-100 text-amber-800",
    },
    {
      key: "CANCELLED",
      label: "Cancelled",
      value: cancelledCount,
      badgeClass: "bg-red-100 text-red-800",
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Subscriptions</h1>
        <span className="ml-3 text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary-container/20 text-primary">
          {totalCount} total
        </span>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div
                key={stat.key}
                className="bg-surface-container-lowest rounded-2xl ghost-border p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0">
                    <Icon name={STAT_ICONS[stat.key]} className="text-white text-xl" />
                  </div>
                  <span className="text-xs font-label text-on-surface-variant">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-headline text-on-surface">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Grant button */}
          <div className="flex justify-end">
            <button
              onClick={() => setGrantOpen(true)}
              className="gold-gradient text-white px-5 py-2.5 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Icon name="card_giftcard" className="text-lg" />
              Grant Free Subscription
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="TRIALING">Trialing</option>
            </select>

            {/* Plan filter */}
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="COUPLE_MONTHLY">Personal Monthly</option>
              <option value="COUPLE_YEARLY">Personal Yearly</option>
              <option value="PLANNER_BASIC_MONTHLY">Planner Basic Monthly</option>
              <option value="PLANNER_BASIC_YEARLY">Planner Basic Yearly</option>
              <option value="PLANNER_ADVANCED_MONTHLY">
                Planner Advanced Monthly
              </option>
              <option value="PLANNER_ADVANCED_YEARLY">
                Planner Advanced Yearly
              </option>
            </select>

            {/* Search */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Showing count */}
            {(search || filterStatus !== "all" || filterPlan !== "all") && (
              <span className="text-xs font-label text-on-surface-variant whitespace-nowrap">
                {total} of {totalCount} match
              </span>
            )}
          </div>

          {/* Subscriptions Table */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Billing Period
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Stripe Customer
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Renewal Date
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Actions
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
                      {/* User */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-label font-semibold text-primary">
                              {getInitials(item.user.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-label font-medium text-on-surface truncate">
                              {item.user.name}
                            </p>
                            <p className="text-[11px] font-label text-on-surface-variant truncate">
                              {item.user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-label font-medium text-on-surface whitespace-nowrap">
                            {PLAN_LABELS[item.plan] || item.plan}
                          </span>
                          {!item.stripeSubscriptionId && (
                            <span
                              className="text-[10px] font-label font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary"
                              title="Granted by admin — not paid via Stripe"
                            >
                              COMP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5">
                        <span
                          className={`text-xs font-label font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                            STATUS_STYLES[item.status] ||
                            "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                        {item.cancelAtPeriodEnd &&
                          item.status !== "CANCELLED" && (
                            <span className="ml-1.5 text-[10px] font-label font-medium text-amber-600">
                              Pending cancel
                            </span>
                          )}
                      </td>

                      {/* Billing Period */}
                      <td className="px-6 py-3.5">
                        <span className="text-sm font-label text-on-surface-variant whitespace-nowrap">
                          {item.currentPeriodStart && item.currentPeriodEnd
                            ? `${formatDate(item.currentPeriodStart)} \u2013 ${formatDate(item.currentPeriodEnd)}`
                            : "\u2014"}
                        </span>
                      </td>

                      {/* Stripe Customer ID */}
                      <td className="px-6 py-3.5">
                        {item.stripeCustomerId ? (
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-label text-on-surface-variant">
                              {truncateStripeId(item.stripeCustomerId)}
                            </code>
                            <button
                              onClick={() =>
                                handleCopy(item.stripeCustomerId!, item.id)
                              }
                              className="p-1 rounded-md hover:bg-surface-container transition-colors cursor-pointer shrink-0"
                              title="Copy Stripe Customer ID"
                            >
                              <Icon name={copiedId === item.id
                                  ? "check"
                                  : "content_copy"} className="text-on-surface-variant text-sm" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-label text-on-surface-variant">
                            {"\u2014"}
                          </span>
                        )}
                      </td>

                      {/* Renewal Date */}
                      <td className="px-6 py-3.5">
                        {item.status === "CANCELLED" ? (
                          <span className="text-sm font-label text-red-600 whitespace-nowrap">
                            Cancelled
                          </span>
                        ) : item.cancelAtPeriodEnd ? (
                          <span className="text-sm font-label text-amber-600 whitespace-nowrap">
                            Cancels on {formatDate(item.currentPeriodEnd)}
                          </span>
                        ) : (
                          <span className="text-sm font-label text-on-surface-variant whitespace-nowrap">
                            {formatDate(item.currentPeriodEnd)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(`/admin/users/${item.user.id}`)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-medium hover:bg-primary/20 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Icon name="person" className="text-sm" />
                            View
                          </button>
                          {item.stripeSubscriptionId ? (
                            <ActionsDropdown
                              item={item}
                              onAction={(action) =>
                                setPendingAction({ type: action, item })
                              }
                            />
                          ) : (
                            <button
                              onClick={() => setRevokeTarget(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-label font-medium hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                              title="Revoke complimentary subscription"
                            >
                              <Icon name="lock_reset" className="text-sm" />
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Icon name="credit_card_off" className="text-on-surface-variant/40 text-5xl" />
                          <p className="text-sm font-label text-on-surface-variant">
                            {search ||
                            filterStatus !== "all" ||
                            filterPlan !== "all"
                              ? "No subscriptions match your filters."
                              : "No subscriptions yet."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden p-3 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-low/40 rounded-xl p-4 space-y-3"
                >
                  {/* Header: avatar + name */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-label font-semibold text-primary">
                        {getInitials(item.user.name)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-label font-medium text-on-surface truncate">
                        {item.user.name}
                      </p>
                      <p className="text-xs font-label text-on-surface-variant truncate">
                        {item.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-label font-medium text-on-surface">
                      {PLAN_LABELS[item.plan] || item.plan}
                    </span>
                    {!item.stripeSubscriptionId && (
                      <span className="text-[10px] font-label font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                        COMP
                      </span>
                    )}
                    <span
                      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                        STATUS_STYLES[item.status] ||
                        "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                    {item.cancelAtPeriodEnd && item.status !== "CANCELLED" && (
                      <span className="text-[10px] font-label font-medium text-amber-600 self-center">
                        Pending cancel
                      </span>
                    )}
                  </div>

                  {/* Renewal info */}
                  <div className="text-xs font-label text-on-surface-variant">
                    {item.status === "CANCELLED" ? (
                      <span className="text-red-600">Cancelled</span>
                    ) : item.cancelAtPeriodEnd ? (
                      <span className="text-amber-600">
                        Cancels on {formatDate(item.currentPeriodEnd)}
                      </span>
                    ) : (
                      <span>Renews {formatDate(item.currentPeriodEnd)}</span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() =>
                        router.push(`/admin/users/${item.user.id}`)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <Icon name="person" className="text-sm" />
                      View
                    </button>
                    {item.stripeSubscriptionId ? (
                      <ActionsDropdown
                        item={item}
                        onAction={(action) =>
                          setPendingAction({ type: action, item })
                        }
                      />
                    ) : (
                      <button
                        onClick={() => setRevokeTarget(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-label font-medium hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Icon name="lock_reset" className="text-sm" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-3 py-12 text-center">
                  <Icon name="credit_card_off" className="text-on-surface-variant/40 text-5xl block mb-2" />
                  <p className="text-sm font-label text-on-surface-variant">
                    {search ||
                    filterStatus !== "all" ||
                    filterPlan !== "all"
                      ? "No subscriptions match your filters."
                      : "No subscriptions yet."}
                  </p>
                </div>
              )}
            </div>

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
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <ConfirmActionModal
          action={pendingAction.type}
          item={pendingAction.item}
          onConfirm={handleConfirmAction}
          onCancel={() => setPendingAction(null)}
          processing={processing}
        />
      )}

      {/* Grant modal */}
      {grantOpen && (
        <GrantSubscriptionModal
          onClose={() => setGrantOpen(false)}
          onGranted={refetchSubscriptions}
          pushToast={(message, type) => setToast({ message, type })}
        />
      )}

      {/* Revoke confirm */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border max-w-md w-full ambient-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Icon name="lock_reset" className="text-red-600" />
              </div>
              <div>
                <h3 className="font-headline text-lg text-on-surface">
                  Revoke Comp Subscription
                </h3>
                <p className="text-xs font-label text-on-surface-variant">
                  {revokeTarget.user.name} &middot; {revokeTarget.user.email}
                </p>
              </div>
            </div>
            <p className="text-sm font-label text-on-surface-variant mb-5">
              The user will immediately lose access to paid features. No Stripe
              charges or refunds are involved. You can grant a new comp anytime.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={processing}
                className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={processing}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-label font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {processing ? "Revoking..." : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
