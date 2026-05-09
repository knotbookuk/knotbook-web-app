"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjectLine: string;
  senderName: string;
  replyTo: string;
  enabled: boolean;
  variables: string[];
  totalSent: number;
  lastSentAt: string | null;
}

interface EmailLog {
  id: string;
  templateSlug: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: "SENT" | "FAILED" | "BOUNCED";
  error: string | null;
  sentAt: string;
  template: { name: string };
}

interface Stats {
  totalSent: number;
  totalFailed: number;
  deliveryRate: number;
}

type CronType = "vendor-reminders" | "task-reminders" | "event-reminders";

interface CronTriggerState {
  loading: boolean;
  result: { ok: boolean; message: string } | null;
}

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ICON_MAP: Record<string, string> = {
  "welcome": "waving_hand",
  "password-reset": "lock_reset",
  "rsvp-confirmation": "how_to_reg",
  "task-reminder": "task_alt",
  "event-reminder": "event",
  "payment-receipt": "receipt_long",
  "budget-alert": "account_balance_wallet",
  "vendor-reminder": "storefront",
};

/* ─── Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-32 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 ghost-border h-28 animate-pulse" />
            ))}
          </div>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-96 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminEmailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSent: 0, totalFailed: 0, deliveryRate: 100 });
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logPagination, setLogPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [configModal, setConfigModal] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({ subjectLine: "", senderName: "", replyTo: "" });
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [testModal, setTestModal] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });

  const [logFilter, setLogFilter] = useState<string>("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("");

  const [cronStates, setCronStates] = useState<Record<CronType, CronTriggerState>>({
    "vendor-reminders": { loading: false, result: null },
    "task-reminders": { loading: false, result: null },
    "event-reminders": { loading: false, result: null },
  });

  async function triggerCron(type: CronType) {
    setCronStates((s) => ({ ...s, [type]: { loading: true, result: null } }));
    try {
      const res = await fetch(`/api/admin/cron/${type}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      const ok = res.ok;
      let message: string;
      if (ok) {
        if (typeof json?.message === "string") {
          message = json.message;
        } else if (
          typeof json?.sent === "number" ||
          typeof json?.skipped === "number" ||
          typeof json?.failed === "number"
        ) {
          message = `Sent ${json.sent ?? 0}, skipped ${json.skipped ?? 0}, failed ${json.failed ?? 0}`;
        } else {
          message = "Triggered successfully.";
        }
      } else {
        message = json?.error || `Request failed (${res.status})`;
      }
      setCronStates((s) => ({ ...s, [type]: { loading: false, result: { ok, message } } }));
    } catch (err) {
      setCronStates((s) => ({
        ...s,
        [type]: {
          loading: false,
          result: { ok: false, message: (err as Error).message || "Network error" },
        },
      }));
    }
  }

  // Redirect non-admin
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [session, router]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/emails");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates);
      setStats(data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (logFilter) params.set("template", logFilter);
      if (logStatusFilter) params.set("status", logStatusFilter);
      const res = await fetch(`/api/admin/emails/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
      setLogPagination(data.pagination);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }, [logFilter, logStatusFilter, showToast]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchTemplates();
    }
  }, [status, session, fetchTemplates]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchLogs]);

  // Toggle template enabled/disabled
  async function handleToggle(slug: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/emails/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, enabled } : t)));
      showToast(`${enabled ? "Enabled" : "Disabled"} template`, "success");
    } catch {
      showToast("Failed to update template", "error");
    }
  }

  // Open config modal
  function openConfig(template: EmailTemplate) {
    setEditForm({
      subjectLine: template.subjectLine,
      senderName: template.senderName,
      replyTo: template.replyTo,
    });
    setConfigModal(template);
  }

  // Save config
  async function handleSaveConfig() {
    if (!configModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/${configModal.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.slug === configModal.slug ? { ...t, ...updated } : t)));
      setConfigModal(null);
      showToast("Template updated", "success");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  }

  // Open test-email modal with the admin's email pre-filled.
  function openTestModal(template: EmailTemplate) {
    setTestEmail(session?.user?.email || "");
    setTestModal(template);
  }

  // Send test email to the address chosen in the modal.
  async function handleSendTest() {
    if (!testModal) return;
    const slug = testModal.slug;
    const to = testEmail.trim();
    if (!to) {
      showToast("Enter a recipient email address", "error");
      return;
    }
    setSendingTest(slug);
    try {
      const res = await fetch(`/api/admin/emails/${slug}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      showToast(data.message, "success");
      setTestModal(null);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSendingTest(null);
    }
  }

  if (status === "loading" || loading) return <LoadingSkeleton />;
  if (!session || session.user.role !== "ADMIN") return null;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">Failed to load email data</h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between gap-3 pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface truncate hidden sm:block">Email Templates</h1>
        <h1 className="font-headline text-xl text-on-surface truncate sm:hidden">Emails</h1>
        <div className="flex gap-2 shrink-0">
          {(["templates", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {tab === "templates" ? "Templates" : "Logs"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Emails Sent", value: stats.totalSent.toLocaleString(), icon: "send" },
              { label: "Delivery Rate", value: `${stats.deliveryRate}%`, icon: "verified" },
              { label: "Active Templates", value: templates.filter((t) => t.enabled).length + "/" + templates.length, icon: "toggle_on" },
            ].map((m) => (
              <div key={m.label} className="bg-surface-container-lowest rounded-2xl p-5 ghost-border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Icon name={m.icon} className="text-primary/50 text-2xl" />
                </div>
                <p className="font-headline text-3xl text-on-surface">{m.value}</p>
                <p className="text-xs font-label text-on-surface-variant mt-1 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Reminder Crons */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div>
                <h2 className="font-headline text-lg text-on-surface">Reminder Crons</h2>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">
                  Manually trigger the daily reminder digests (also runs on a schedule via GitHub Actions at 08:00 UTC). Multiple items per user are grouped into a single email.
                </p>
              </div>
              <Icon name="schedule" className="text-primary/40" />
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { type: "vendor-reminders" as const, label: "Trigger vendor payment reminders", icon: "payments" },
                  { type: "task-reminders" as const, label: "Trigger task reminders", icon: "checklist" },
                  { type: "event-reminders" as const, label: "Trigger event reminders", icon: "event" },
                ]
              ).map(({ type, label, icon }) => {
                const state = cronStates[type];
                return (
                  <div key={type} className="rounded-xl p-4 ghost-border bg-surface-container-low/30 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name={icon} className="text-primary/60 text-xl" />
                      <span className="text-sm font-label font-medium text-on-surface">{label}</span>
                    </div>
                    <button
                      onClick={() => triggerCron(type)}
                      disabled={state.loading}
                      className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {state.loading && (
                        <Icon name="progress_activity" className="text-sm animate-spin" />
                      )}
                      {state.loading ? "Running..." : "Run now"}
                    </button>
                    {state.result && (
                      <div
                        className={`text-xs font-label rounded-lg px-3 py-2 ${
                          state.result.ok
                            ? "bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-red-900/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {state.result.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-headline text-lg text-on-surface">All Templates</h2>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">Manage email templates, toggle them on/off, and customise subject lines</p>
              </div>

              <div className="divide-y divide-outline-variant/10">
                {templates.map((t) => (
                  <div key={t.slug} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-surface-container-low/30 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name={ICON_MAP[t.slug] || "mail"} className="text-primary text-xl" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-label font-medium text-on-surface truncate">{t.name}</p>
                        <p className="text-xs font-label text-on-surface-variant truncate">{t.description}</p>
                        <p className="text-[11px] font-label text-on-surface-variant/70 mt-0.5 truncate">
                          Subject: <span className="text-on-surface-variant">{t.subjectLine}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:block text-right shrink-0 w-24">
                      <p className="text-sm font-label font-medium text-on-surface">{t.totalSent}</p>
                      <p className="text-[11px] font-label text-on-surface-variant">sent</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <span className="text-xs font-label text-on-surface-variant sm:hidden">
                        {t.totalSent} sent
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggle(t.slug, !t.enabled)}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${t.enabled ? "bg-primary" : "bg-surface-container"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${t.enabled ? "left-[22px]" : "left-0.5"}`} />
                        </button>

                        {/* Configure */}
                        <button onClick={() => openConfig(t)} className="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer" title="Configure">
                          <Icon name="settings" className="text-on-surface-variant text-xl" />
                        </button>

                        {/* Send Test */}
                        <button
                          onClick={() => openTestModal(t)}
                          disabled={sendingTest === t.slug}
                          className="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                          title="Send test email"
                        >
                          <Icon name={sendingTest === t.slug ? "progress_activity" : "send"} className={`text-on-surface-variant text-xl ${sendingTest === t.slug ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline text-lg text-on-surface">Email Log</h2>
                  <p className="text-xs font-label text-on-surface-variant mt-0.5">Recent email activity</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="text-sm font-label bg-surface-container border-0 rounded-lg px-3 py-1.5 text-on-surface cursor-pointer"
                  >
                    <option value="">All templates</option>
                    {templates.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    className="text-sm font-label bg-surface-container border-0 rounded-lg px-3 py-1.5 text-on-surface cursor-pointer"
                  >
                    <option value="">All statuses</option>
                    <option value="SENT">Sent</option>
                    <option value="FAILED">Failed</option>
                    <option value="BOUNCED">Bounced</option>
                  </select>
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Icon name="inbox" className="text-on-surface-variant/30 text-5xl mb-3 block" />
                  <p className="text-sm font-label text-on-surface-variant">No emails sent yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/15">
                          {["Template", "Recipient", "Subject", "Status", "Date"].map((h) => (
                            <th key={h} className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                            <td className="px-6 py-3 text-sm font-label text-on-surface">{log.template.name}</td>
                            <td className="px-6 py-3">
                              <p className="text-sm font-label text-on-surface">{log.recipientName || "—"}</p>
                              <p className="text-xs font-label text-on-surface-variant">{log.recipientEmail}</p>
                            </td>
                            <td className="px-6 py-3 text-sm font-label text-on-surface-variant max-w-[200px] truncate">{log.subject}</td>
                            <td className="px-6 py-3">
                              <span className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                                log.status === "SENT" ? "bg-green-100 text-green-700" :
                                log.status === "FAILED" ? "bg-red-100 text-red-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-label text-on-surface-variant">{formatDate(log.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden p-3 space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-surface-container-low/40 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-label font-medium text-on-surface truncate min-w-0">
                            {log.template.name}
                          </p>
                          <span className={`text-[10px] font-label font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            log.status === "SENT" ? "bg-green-100 text-green-700" :
                            log.status === "FAILED" ? "bg-red-100 text-red-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs font-label text-on-surface-variant truncate">
                          To: {log.recipientName || log.recipientEmail}
                        </p>
                        {log.recipientName && (
                          <p className="text-[11px] font-label text-on-surface-variant/70 truncate">
                            {log.recipientEmail}
                          </p>
                        )}
                        <p className="text-xs font-label text-on-surface-variant mt-1.5 line-clamp-2">
                          {log.subject}
                        </p>
                        <p className="text-[11px] font-label text-on-surface-variant/70 mt-2">
                          {formatDate(log.sentAt)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {logPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between">
                      <p className="text-xs font-label text-on-surface-variant">
                        Page {logPagination.page} of {logPagination.totalPages} ({logPagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchLogs(logPagination.page - 1)}
                          disabled={logPagination.page <= 1}
                          className="px-3 py-1.5 rounded-lg text-sm font-label bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchLogs(logPagination.page + 1)}
                          disabled={logPagination.page >= logPagination.totalPages}
                          className="px-3 py-1.5 rounded-lg text-sm font-label bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configure Modal */}
      {configModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border w-full sm:max-w-lg max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto pb-20 sm:pb-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div>
                <h3 className="font-headline text-lg text-on-surface">{configModal.name}</h3>
                <p className="text-xs font-label text-on-surface-variant">{configModal.description}</p>
              </div>
              <button onClick={() => setConfigModal(null)} className="p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer">
                <Icon name="close" className="text-on-surface-variant" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Subject Line */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Subject Line</label>
                <input
                  type="text"
                  value={editForm.subjectLine}
                  onChange={(e) => setEditForm({ ...editForm, subjectLine: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(configModal.variables as string[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditForm({ ...editForm, subjectLine: editForm.subjectLine + `{${v}}` })}
                      className="text-[11px] font-label px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Sender Name</label>
                <input
                  type="text"
                  value={editForm.senderName}
                  onChange={(e) => setEditForm({ ...editForm, senderName: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="KnotBook"
                />
              </div>

              {/* Reply-To */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Reply-To Address</label>
                <input
                  type="email"
                  value={editForm.replyTo}
                  onChange={(e) => setEditForm({ ...editForm, replyTo: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Optional"
                />
              </div>

              {/* Available Variables */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Available Variables</label>
                <div className="flex flex-wrap gap-2">
                  {(configModal.variables as string[]).map((v) => (
                    <span key={v} className="text-xs font-label px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                      {`{${v}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button onClick={() => setConfigModal(null)} className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {saving && <Icon name="progress_activity" className="text-sm animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {testModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border w-full sm:max-w-md max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto pb-20 sm:pb-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div>
                <h3 className="font-headline text-lg text-on-surface">Send Test Email</h3>
                <p className="text-xs font-label text-on-surface-variant">{testModal.name}</p>
              </div>
              <button onClick={() => setTestModal(null)} className="p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer">
                <Icon name="close" className="text-on-surface-variant" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant">Recipient</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sendingTest) handleSendTest();
                }}
                placeholder="you@example.com"
                autoFocus
                className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-[11px] font-label text-on-surface-variant/70">
                Sends a fully-rendered preview using sample data.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button onClick={() => setTestModal(null)} className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest === testModal.slug}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {sendingTest === testModal.slug && <Icon name="progress_activity" className="text-sm animate-spin" />}
                {sendingTest === testModal.slug ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-label font-medium animate-fade-in-up ${
          toast.type === "success" ? "bg-green-800 text-white" : "bg-red-800 text-white"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
