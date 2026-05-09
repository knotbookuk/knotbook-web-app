"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotifPrefs {
  emailRSVP: boolean;
  emailPayments: boolean;
  emailTasks: boolean;
  emailEvents: boolean;
  emailBudget: boolean;
  smsReminders: boolean;
  smsUrgent: boolean;
}

const typeConfig: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  RSVP: { icon: "mail", iconBg: "bg-primary-container/20", iconColor: "text-primary" },
  PAYMENT: { icon: "payments", iconBg: "bg-tertiary-container/20", iconColor: "text-tertiary" },
  TASK: { icon: "task_alt", iconBg: "bg-primary-container/20", iconColor: "text-primary" },
  VENDOR: { icon: "storefront", iconBg: "bg-secondary-container/30", iconColor: "text-secondary" },
  SYSTEM: { icon: "info", iconBg: "bg-surface-container", iconColor: "text-on-surface-variant" },
};

/* ─── Skeleton ─── */
function NotificationsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between">
        <div>
          <div className="h-12 w-56 bg-surface-container rounded-xl" />
          <div className="mt-2 h-4 w-40 bg-surface-container rounded-lg" />
        </div>
        <div className="h-10 w-40 bg-surface-container rounded-full" />
      </div>
      <div className="bg-surface-container-low rounded-3xl p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-surface-container rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    emailRSVP: true,
    emailPayments: false,
    emailTasks: false,
    emailEvents: false,
    emailBudget: false,
    smsReminders: false,
    smsUrgent: false,
  });

  // Load notification preferences from API
  useEffect(() => {
    fetch("/api/user/notification-prefs")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setPrefs({
            emailRSVP: data.emailRsvp ?? true,
            emailPayments: data.emailPayment ?? false,
            emailTasks: data.emailTasks ?? false,
            emailEvents: data.emailEvents ?? false,
            emailBudget: data.emailBudget ?? false,
            smsReminders: data.smsDayOf ?? false,
            smsUrgent: data.smsUrgent ?? false,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const unreadNotifs = notifications.filter((n) => !n.isRead);
  const readNotifs = notifications.filter((n) => n.isRead);

  const markAllRead = async () => {
    const unreadIds = unreadNotifs.map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });
      if (!res.ok) {
        // Revert on failure
        fetchNotifications();
      }
    } catch {
      fetchNotifications();
    }
  };

  const markSingleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // silently fail
    }
  };

  // Map NotifPrefs keys to API keys
  const prefKeyMap: Record<keyof NotifPrefs, string> = {
    emailRSVP: "emailRsvp",
    emailPayments: "emailPayment",
    emailTasks: "emailTasks",
    emailEvents: "emailEvents",
    emailBudget: "emailBudget",
    smsReminders: "smsDayOf",
    smsUrgent: "smsUrgent",
  };

  const togglePref = (key: keyof NotifPrefs) => {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const apiKey = prefKeyMap[key];
      fetch("/api/user/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiKey]: updated[key] }),
      }).catch(() => {});
      return updated;
    });
  };

  const NotificationItem = ({ notif }: { notif: Notification }) => {
    const config = typeConfig[notif.type] || typeConfig.SYSTEM;
    return (
      <div
        className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${
          !notif.isRead
            ? "bg-primary-container/5 ghost-border cursor-pointer"
            : "hover:bg-surface-container-low"
        }`}
        onClick={() => {
          if (!notif.isRead) markSingleRead(notif.id);
        }}
      >
        {/* Unread Dot */}
        <div className="flex items-center pt-1">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              !notif.isRead ? "gold-gradient shadow-sm" : "bg-transparent"
            }`}
          />
        </div>

        {/* Icon Circle */}
        <div
          className={`w-11 h-11 rounded-full ${config.iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon name={config.icon} className={`text-xl ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm ${
              !notif.isRead
                ? "font-semibold text-on-surface"
                : "font-medium text-on-surface"
            }`}
          >
            {notif.title}
          </p>
          {notif.message && (
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {notif.message}
            </p>
          )}
          <p className="text-[10px] text-on-surface-variant/50 mt-1.5 font-label">
            {formatTimestamp(notif.createdAt)}
          </p>
        </div>
      </div>
    );
  };

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-all cursor-pointer ${
        checked ? "gold-gradient" : "bg-outline-variant/40"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );

  if (loading) return <NotificationsSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-label">
            {unreadNotifs.length} unread notification{unreadNotifs.length !== 1 && "s"}
          </p>
        </div>
        {unreadNotifs.length > 0 && (
          <button
            onClick={markAllRead}
            className="px-5 py-2.5 rounded-full border border-outline-variant/40 text-sm font-label font-medium text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Icon name="done_all" className="text-lg" />
            Mark all as read
          </button>
        )}
      </div>

      {/* New Notifications */}
      {unreadNotifs.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
          <h2 className="font-headline text-xl text-on-surface mb-4">New</h2>
          <div className="space-y-2">
            {unreadNotifs.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} />
            ))}
          </div>
        </section>
      )}

      {/* Earlier Notifications */}
      {readNotifs.length > 0 && (
        <section className="bg-surface-container-lowest rounded-3xl p-6 ambient-shadow ghost-border">
          <h2 className="font-headline text-xl text-on-surface mb-4">Earlier</h2>
          <div className="space-y-2">
            {readNotifs.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {notifications.length === 0 && (
        <div className="text-center py-20">
          <Icon name="notifications_none" className="text-5xl text-primary/20" />
          <p className="mt-4 text-on-surface-variant/50 font-label text-sm">
            No notifications yet. You&apos;ll see updates here as your wedding planning progresses.
          </p>
        </div>
      )}

      {/* Auto-Generated Notifications Info */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 ambient-shadow ghost-border">
        <h2 className="font-headline text-xl text-on-surface mb-1">
          What You&apos;ll Be Notified About
        </h2>
        <p className="text-sm text-on-surface-variant font-label mb-6">
          KnotBook automatically sends email notifications for key wedding planning events
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="how_to_reg" className="text-primary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">RSVP Confirmations</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Guests receive a confirmation email when they RSVP</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="storefront" className="text-tertiary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">Vendor Payment Reminders</p>
              <p className="text-xs text-on-surface-variant mt-0.5">When a vendor payment is due within 7 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="task_alt" className="text-primary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">Task Reminders</p>
              <p className="text-xs text-on-surface-variant mt-0.5">When a task is due within 24 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="event" className="text-secondary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">Event Reminders</p>
              <p className="text-xs text-on-surface-variant mt-0.5">When a wedding event is coming up within 7 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="account_balance_wallet" className="text-tertiary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">Budget Alerts</p>
              <p className="text-xs text-on-surface-variant mt-0.5">When spending reaches 80%, 90%, or 100% of your budget</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low/50">
            <Icon name="waving_hand" className="text-primary text-xl mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-surface">Welcome Email</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Sent automatically when you create your account</p>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 ambient-shadow ghost-border">
        <h2 className="font-headline text-xl text-on-surface mb-1">
          Notification Preferences
        </h2>
        <p className="text-sm text-on-surface-variant font-label mb-6">
          Choose how you&apos;d like to be notified via email and SMS
        </p>

        <div className="space-y-6">
          {/* Email Section */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-primary/60 font-label font-semibold mb-4">
              Email Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">RSVP Confirmations</p>
                  <p className="text-xs text-on-surface-variant">
                    Confirmation emails sent to guests when they RSVP
                  </p>
                </div>
                <Toggle
                  checked={prefs.emailRSVP}
                  onChange={() => togglePref("emailRSVP")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Vendor Payment Reminders
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    When vendor payments are due within 7 days
                  </p>
                </div>
                <Toggle
                  checked={prefs.emailPayments}
                  onChange={() => togglePref("emailPayments")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Task Reminders</p>
                  <p className="text-xs text-on-surface-variant">
                    Alerts when tasks are due within 24 hours
                  </p>
                </div>
                <Toggle
                  checked={prefs.emailTasks}
                  onChange={() => togglePref("emailTasks")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Event Reminders</p>
                  <p className="text-xs text-on-surface-variant">
                    Reminders for upcoming wedding events within 7 days
                  </p>
                </div>
                <Toggle
                  checked={prefs.emailEvents}
                  onChange={() => togglePref("emailEvents")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">Budget Alerts</p>
                  <p className="text-xs text-on-surface-variant">
                    When spending reaches 80%, 90%, or 100% of your budget
                  </p>
                </div>
                <Toggle
                  checked={prefs.emailBudget}
                  onChange={() => togglePref("emailBudget")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/30" />

          {/* SMS Section */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-primary/60 font-label font-semibold mb-4">
              SMS Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Day-of Reminders
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Appointment and event reminders via text
                  </p>
                </div>
                <Toggle
                  checked={prefs.smsReminders}
                  onChange={() => togglePref("smsReminders")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    Urgent Alerts Only
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Critical updates like vendor cancellations
                  </p>
                </div>
                <Toggle
                  checked={prefs.smsUrgent}
                  onChange={() => togglePref("smsUrgent")}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/30" />

          {/* Note */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-container/5 ghost-border">
            <Icon name="info" className="text-primary/60 text-xl mt-0.5" />
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Email notifications are active. SMS notifications are coming soon. Your preferences are saved automatically.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
