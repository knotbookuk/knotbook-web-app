"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface FeedbackItem {
  id: string;
  featureArea: string;
  rating: number;
  message: string;
  screenshotUrl: string | null;
  isRead: boolean;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon name="star" className={`text-base transition-colors ${ star <= value ? "text-amber-500" : "text-on-surface-variant/25" }`} />
      ))}
    </div>
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

/* ─── Detail Panel ─── */

function FeedbackDetail({
  item,
  onClose,
  onUpdate,
}: {
  item: FeedbackItem;
  onClose: () => void;
  onUpdate: (updated: FeedbackItem) => void;
}) {
  const [adminNotes, setAdminNotes] = useState(item.adminNotes || "");
  const [saving, setSaving] = useState(false);

  const handleMarkRead = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !item.isRead }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes, isRead: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-xl max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-headline text-2xl text-on-surface">
              Feedback Detail
            </h3>
            <p className="text-xs font-label text-on-surface-variant mt-0.5">
              {formatDate(item.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-on-surface-variant" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-surface-container-low rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-label font-semibold text-primary">
                {item.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-sm font-label font-medium text-on-surface">
                {item.user.name}
              </p>
              <p className="text-xs font-label text-on-surface-variant">
                {item.user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
              Feature Area
            </span>
            <span className="text-sm font-label font-medium text-on-surface">
              {item.featureArea}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
              Rating
            </span>
            <StarRating value={item.rating} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
              Status
            </span>
            <span
              className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                item.isRead
                  ? "bg-green-100 text-green-800"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {item.isRead ? "Reviewed" : "Unread"}
            </span>
          </div>
        </div>

        {/* Full Message */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-2">
            Message
          </p>
          <div className="bg-surface-container-low rounded-xl p-4 text-sm font-label text-on-surface whitespace-pre-wrap leading-relaxed">
            {item.message}
          </div>
        </div>

        {/* Admin Notes */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-1.5 block">
            Admin Notes
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full bg-surface-container-low rounded-xl py-3 px-4 ghost-border font-label text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            rows={3}
            placeholder="Add internal notes about this feedback..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="flex-1 gold-gradient text-white py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-70 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Notes"}
          </button>
          <button
            onClick={handleMarkRead}
            disabled={saving}
            className="px-5 py-3 rounded-full border border-outline-variant/40 text-sm font-label text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
          >
            {item.isRead ? "Mark Unread" : "Mark Read"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminFeedbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">("all");
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);

  // ─── Pagination State ───
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch feedback (server-side pagination + search + filter)
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("paginate", "true");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (filterRead !== "all") {
        params.set("read", filterRead);
      }

      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch feedback (${res.status})`);
      }
      const json: {
        items: FeedbackItem[];
        total: number;
        page: number;
        pageSize: number;
        unreadCount: number;
      } = await res.json();
      setItems(json.items);
      setTotal(json.total);
      setUnreadCount(json.unreadCount);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterRead]);

  // Reset to page 1 whenever search/filter narrows
  useEffect(() => {
    setPage(1);
  }, [search, filterRead]);

  // Single fetch effect — debounced for search, immediate for other changes
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;
    const timer = setTimeout(() => {
      fetchData();
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [status, session, fetchData, search]);

  const handleUpdate = (updated: FeedbackItem) => {
    setSelectedItem(updated);
    // Refetch to keep the current page row in sync AND refresh unreadCount.
    fetchData();
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
            Failed to load feedback
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
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Feedback</h1>
        {unreadCount > 0 && (
          <span className="ml-3 text-xs font-label font-medium px-2.5 py-1 rounded-full bg-primary-container/20 text-primary">
            {unreadCount} unread
          </span>
        )}
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* Header + Search + Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-lg text-on-surface">
                All Feedback
              </h2>
              <p className="text-xs font-label text-on-surface-variant mt-0.5">
                {total} total entr{total !== 1 ? "ies" : "y"}
                {(search || filterRead !== "all") &&
                  ` matching filters`}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Filter dropdown */}
              <select
                value={filterRead}
                onChange={(e) =>
                  setFilterRead(e.target.value as "all" | "read" | "unread")
                }
                className="px-3 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Reviewed</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 sm:w-72">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
                <input
                  type="text"
                  placeholder="Search by user, feature, message..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest ghost-border text-sm font-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Feedback Table */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                      Message
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
                      } ${!item.isRead ? "bg-primary-container/5" : ""}`}
                    >
                      <td className="px-6 py-3.5 text-sm font-label text-on-surface-variant whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-label font-semibold text-primary">
                              {item.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
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
                      <td className="px-6 py-3.5">
                        <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                          {item.featureArea}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <StarRating value={item.rating} />
                      </td>
                      <td className="px-6 py-3.5 max-w-[200px]">
                        <p className="text-sm font-label text-on-surface-variant truncate">
                          {item.message}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <Icon name="visibility" className="text-sm" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm font-label text-on-surface-variant"
                      >
                        {search || filterRead !== "all"
                          ? "No feedback matches your search/filter."
                          : "No feedback submitted yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full text-left bg-surface-container-low/40 rounded-xl p-4 hover:bg-surface-container-low/70 transition-colors ${
                    !item.isRead ? "ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-label font-semibold text-primary">
                        {item.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
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
                    {!item.isRead && (
                      <span className="text-[10px] font-label font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                      {item.featureArea}
                    </span>
                    <StarRating value={item.rating} />
                  </div>
                  <p className="text-sm font-label text-on-surface-variant line-clamp-2 mt-2">
                    {item.message}
                  </p>
                  <p className="text-xs font-label text-on-surface-variant mt-2">
                    {formatDate(item.createdAt)}
                  </p>
                </button>
              ))}
              {items.length === 0 && (
                <p className="px-3 py-8 text-center text-sm font-label text-on-surface-variant">
                  {search || filterRead !== "all"
                    ? "No feedback matches your search/filter."
                    : "No feedback submitted yet."}
                </p>
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

      {/* Detail Modal */}
      {selectedItem && (
        <FeedbackDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
